/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from "react";
// import request from '../util/Request';
import pxToDp from "../util/util.js";
// import widthScale from "../util/util";
// import Navigation from "./component/navigation";
import GoodsList from "../components/goodList.js";
import LoadingActivity from "../components/loadingActivity.js";
// import BrowserIcon from '../components/browserIcon.js';
import Swiper from "react-native-swiper";
import LinearGradient from "react-native-linear-gradient";

import {
  Text,
  View,
  Image,
  Linking,
  FlatList,
  ScrollView,
  CameraRoll,
  Clipboard,
  PermissionsAndroid,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import Toast from "react-native-simple-toast";
import request from "../util/Request.js";
import { DefaultTheme } from "@react-navigation/native";
import AsyncStorage from "@react-native-community/async-storage";
import ShareModal from "../components/shareModal.js";
import RNFetchBlob from "rn-fetch-blob";
import { set } from "react-native-reanimated";
// const RNFS = require('react-native-fs');
// import {APP_BASE_URL, WECHAT_MINI_KEY, WECHAT_MINI_TYPE} from '../AppConfig';
// import RNAlibcSdk from '../util/AlibcSdk';

function Detail({ navigation, route }) {
  const { item } = route.params;
  let app_url = "";
  let web_url = "";
  let role = 1;
  let animate;
  let is_scroll = false;
  const [showLoading, setShowLoading] = useState(false);

  const goToApp = (appurl) => {
    console.log(appurl)
    const tempurl = appurl.replace(/(^\w+:|^)\/\//, 'pinduoduo://');
    console.log(tempurl);
    Linking.canOpenURL(appurl)
      .then((canOpen) => {
        if (!canOpen) {
          console.log("打开web url: ");
          return Linking.openURL(appurl).catch((err) =>
          console.error("An error occurred", err)
        );
        } else {
          console.log("打开app url: " + appurl);
          return Linking.openURL(tempurl).catch((err) =>
            console.error("An error occurred", err)
            );
        }
      })
      .catch((err) => console.error("An error occurred", err));
  };

  const checkPermission = async () => {
    //Function to check the platform
    //If iOS the start downloading
    //If Android then ask for runtime permission

    if (Platform.OS === "ios") {
      downloadImage();
    } else {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: "Storage Permission Required",
            message: "This app needs access to your storage to download Photos",
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          //Once user grant the permission start downloading
          console.log("Storage Permission Granted.");
          downloadImage();
        } else {
          //If permission denied then show alert 'Storage Permission Not Granted'
          alert("Storage Permission Not Granted");
        }
      } catch (err) {
        //To handle permission related issue
        console.warn(err);
      }
    }
  };

  const downloadImage = () => {
    //Main function to download the image
    let date = new Date(); //To add the time suffix in filename
    //Image URL which we want to download
    let image_URL = share_img;

    //Getting the extention of the file
    let ext = getExtention(image_URL);
    ext = "." + ext[0];
    //Get config and fs from RNFetchBlob
    //config: To pass the downloading related options
    //fs: To get the directory path in which we want our image to download
    const { config, fs } = RNFetchBlob;
    let PictureDir = fs.dirs.PictureDir;
    let options = {
      fileCache: true,
      addAndroidDownloads: {
        //Related to the Android only
        useDownloadManager: true,
        notification: true,
        path:
          PictureDir +
          "/image_" +
          Math.floor(date.getTime() + date.getSeconds() / 2) +
          ext,
        description: "Image",
      },
    };
    config(options)
      .fetch("GET", image_URL)
      .then((res) => {
        //Showing alert after successful downloading
        console.log("res -> ", JSON.stringify(res));
        alert("Image Downloaded Successfully.");
      });
  };

  const getExtention = (filename) => {
    //To get the file extension
    return /[.]/.exec(filename) ? /[^.]+$/.exec(filename) : undefined;
  };
  const keyExtractor = (item, index) => index.toString();

  const addtoCollections = () => {
    AsyncStorage.getItem("token").then((value) => {
      if (value !== "") {
        const api = "addtocollection";
        const params = {
          goodsId: item.goods_id,
          collect: collected,
          token: value,
          platform: 1,
        };
        request(api, params, function (res) {
          console.log(res.data);
          setCollected(0);
          getCollectionGoods();
        },function(res){
          navigation.navigate("Login");
        });
      } else {
        navigation.navigate("Login");
      }
    });
  };

  const getCollectionGoods = () => {
    AsyncStorage.getItem("token").then((val) => {
      if (val !== null) {
        const api = "collection_goods_list";
        const params = { token: val };
        request(api, params, function (res) {
          setShowLoading(false);
          setCollected(1);
          let collectionList = res.data.data.collectList;
          console.log(collectionList);
          for (var i = 0; i < collectionList.length; i++) {
            if (collectionList[i].goods_id == item.goods_id) {
              setCollected(0);
              break;
            }
          }
        },function(res){
          navigation.navigate("Login");
        });
      } else {
        navigation.navigate("Login");
      }
    });
  };

  useEffect(() => {
    AsyncStorage.getItem("token").then((val) => {
      if (val !== null) {
        setShowLoading(true);
        getGoodsDetail();
        getPromotionUrl();
        getCollectionGoods();
      } else {
        navigation.navigate("Login");
      }
    });
  }, []);

  const getGoodsDetail = () => {
    const api = "getGoodsDetail";
    console.log(item.goods_id);
    const params = { goodsId: item.goods_id };
    request(
      api,
      params,
      function (res) {
        setProductList(convertToArray(res.data.data.goodsList));
        setDetail(res.data.data);
        if (res.data.data.goodsInfo.goods_gallery_urls !== undefined) {
          setImgList(res.data.data.goodsInfo.goods_gallery_urls);
        } else {
          Toast.show("商品不存在", Toast.SHORT);
          navigation.navigate("Home");
        }
      },
      function (res) {
        navigation.navigate("Login");
      }
    );
  };

  const getPromotionUrl = () => {
    AsyncStorage.getItem("token").then((value) => {
      const api = "goodspromotionurl";

      const params = { platform: 1, goodsId: item.goods_id, token: value };
      request(
        api,
        params,
        function (res) {
          setShareTempleArr(res.data.data.shareTemplateArr);
          setShare_img(res.data.data.share_img);
          setShare_img_h5(res.data.data.share_img_h5);
        },
        function (res) {
          navigation.navigate("Login");
        }
      );
    });
  };

  const getGoodsBuyLink = () => {
    AsyncStorage.getItem("token").then((value) => {
      console.log(value);
      const api = "getgoodsbuyurl";
      const params = { platform: 1, goodsId: item.goods_id, token: value };
      request(
        api,
        params,
        function (res) {
          console.log(res.data.data);
          goToApp(res.data.data.goodsBuyLink.schema_url);
        },
        function (res) {
          navigation.navigate("Login");
        }
      );
    });
  };

  let coupon_info = {
    coupon_amount: 12,
    coupon_remain_count: 2,
    coupon_discount: 20,
  };
  let has_coupon =
    coupon_info &&
    coupon_info.coupon_amount > 0 &&
    coupon_info.coupon_remain_count > 0;

  const [pid, setPid] = useState("");
  const [parent_id, setParent_id] = useState("");
  const [swipeShow, setSwipeShow] = useState(true);
  const [detail, setDetail] = useState();
  const [imgList, setImgList] = useState([]);
  const [detailImage, setDetailImage] = useState([]);
  const [productList, setProductList] = useState([]);
  const [collected, setCollected] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [share_img, setShare_img] = useState();
  const [share_img_h5, setShare_img_h5] = useState();
  const [shareTempleArr, setShareTempleArr] = useState([]);

  const modalClose = () => {
    setModalVisible(false);
  };

  const convertToArray = (data) => {
    let res = [];
    for (var key of Object.keys(data)) {
      res.push(data[key]);
    }
    return res;
  };

  return (
    <View style={styles.container}>
      {modalVisible === true && (
        <ShareModal
          shareTemplateArr={shareTempleArr}
          share_img={share_img}
          share_img_h5={share_img_h5}
          hiddenModal={modalClose}
        />
      )}
      {detail !== undefined && (
        <View>
          {imgList !== undefined ? (
            <ScrollView
              style={{ marginBottom: pxToDp(50) }}
              // onScroll={this.onScroll}
            >
              {/* 商品轮播图 */}
              <View>
                <Swiper
                  horizontal={true}
                  loop={true}
                  showsPagination={false}
                  autoplay={true}
                  style={styles.sliders}
                  showsButtons={false}
                >
                  {imgList.map((item, index) => {
                    return (
                      <Image
                        id={index}
                        style={styles.thumbnail}
                        source={{ uri: item }}
                      />
                    );
                  })}
                </Swiper>
              </View>

              {/* 商品名称 */}
              <Text style={styles.goods_name}>
                {/* {detail.goodsInfo.platform == 1 ? (
                  <Image
                    style={styles.platformlogo}
                    source={require('../image/pinduoduo.png')}
                  />
                ) : detail.goodsInfo.platform == 2 ? (
                  <Image
                    style={styles.platformlogo}
                    source={require('../image/taobao.png')}
                  />
                ) : (
                  <Image
                    style={styles.platformlogo}
                    source={require('../image/jingdong.png')}
                  />
                )} */}

                {detail.goodsInfo.goods_name}
              </Text>

              {/* 价格展示 */}
              <View style={styles.price}>
                {/* 券后价or活动价 */}
                <Text
                  style={{
                    color: "#ff4d00",
                    lineHeight: pxToDp(50),
                    fontSize: pxToDp(28),
                  }}
                >
                  {has_coupon ? "券后价 " : "活动价"}
                </Text>
                <Text
                  style={{
                    color: "#ff4d00",
                    lineHeight: pxToDp(50),
                    fontSize: pxToDp(30),
                  }}
                >
                  {"¥ " + detail.goodsInfo.sale_price}
                </Text>

                {/* 原价 */}
                {has_coupon ? (
                  <Text
                    style={{
                      color: "#8c8b91",
                      lineHeight: pxToDp(50),
                      fontSize: pxToDp(26),
                      marginLeft: pxToDp(15),
                      textDecorationLine: "line-through",
                      textDecorationStyle: "solid",
                    }}
                  >
                    原价￥{detail.goodsInfo.min_group_price}
                  </Text>
                ) : null}

                {has_coupon ? (
                  <View style={styles.coupon}>
                    <Text
                      style={{
                        color: "#ffffff",
                        backgroundColor: "#ff4d00",
                        borderRightColor: "#ffffff",
                        fontSize: pxToDp(24),
                        borderRightWidth: pxToDp(1),
                        borderTopLeftRadius: pxToDp(4),
                        borderBottomLeftRadius: pxToDp(4),
                        paddingLeft: pxToDp(6),
                        paddingRight: pxToDp(6),
                      }}
                    >
                      {"券"}
                    </Text>
                    <Text
                      style={{
                        color: "#ffffff",
                        backgroundColor: "#ff4d00",
                        fontSize: pxToDp(24),
                        borderTopRightRadius: pxToDp(4),
                        borderBottomRightRadius: pxToDp(4),
                        paddingLeft: pxToDp(10),
                        paddingRight: pxToDp(12),
                      }}
                    >
                      ￥{coupon_info.coupon_amount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={{ backgroundColor: "white" }}>
                <Image
                  style={{
                    width: pxToDp(690),
                    height: pxToDp(64.6),
                    marginHorizontal: pxToDp(30),
                  }}
                  source={require("../image/upgrade_captain.png")}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (item.coupon_remain_quantity != 0) {
                      getGoodsBuyLink();
                    }
                  }}
                >
                  <LinearGradient
                    style={{
                      marginTop: pxToDp(25),
                      marginHorizontal: pxToDp(30),
                      borderRadius: pxToDp(10),
                    }}
                    start={{ x: 0.2, y: 0 }}
                    end={{ x: 0.8, y: 0 }}
                    colors={
                      item.coupon_remain_quantity !== 0
                        ? ["#FD8B11", "#ff4d00"]
                        : ["#999999", "#747373"]
                    }
                  >
                    <View
                      style={{
                        flexDirection: "row",
                      }}
                    >
                      <View
                        style={{
                          alignItems: "center",
                          flex: 3,
                          padding: pxToDp(20),
                          borderStyle: "dotted",
                          borderTopRightRadius: 1,
                          borderBottomRightRadius: 1,
                          borderRightWidth: 1.5,
                          borderColor: "white",
                          borderRightColor: "red",
                        }}
                      >
                        <Text style={{ color: "white", fontSize: pxToDp(25) }}>
                          {item.coupon_discount + "元优惠券"}
                        </Text>
                        <Text style={{ color: "white", fontSize: pxToDp(25) }}>
                          {item.coupon_end_time + "前使用"}
                        </Text>
                      </View>
                      {item.coupon_remain_quantity !== 0 ? (
                        <View
                          style={{
                            alignItems: "center",
                            flex: 2,
                            padding: pxToDp(20),
                          }}
                        >
                          <Text
                            style={{ color: "white", fontSize: pxToDp(25) }}
                          >
                            立即领券
                          </Text>
                          <Text
                            style={{ color: "white", fontSize: pxToDp(25) }}
                          >
                            {"剩余" + item.coupon_remain_quantity + "张券"}
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={{
                            alignItems: "center",
                            justifyContent: "center",
                            flex: 2,
                            padding: pxToDp(20),
                          }}
                        >
                          <Text
                            style={{ color: "white", fontSize: pxToDp(30) }}
                          >
                            券已抢完
                          </Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              {/* 店铺信息 */}
              {detail.mallinfo !== undefined ? (
                <View
                  style={{
                    width: pxToDp(750),
                    backgroundColor: "#fff",
                    marginTop: pxToDp(20),
                  }}
                >
                  <View style={styles.shop_area}>
                    <Image
                      source={{ uri: detail.mallinfo.img_url }}
                      style={{ width: pxToDp(100), height: pxToDp(100) }}
                    />
                    <View style={styles.shop_info}>
                      <Text style={{ color: "#1d1d1f", fontSize: pxToDp(32) }}>
                        {detail.mallinfo.mall_name}
                      </Text>
                      <View style={{ color: "#1d1d1f", fontSize: pxToDp(32) }}>
                        {/* {detail.mall.merchant_type == 3 ||
                  tdetail.mall.merchant_type == 4 ||
                  tdetail.mall.merchant_type == 5 ? (
                    <Text>
                      {detail.mall.merchant_type == 3
                        ? "旗舰店"
                        : detail.mall.merchant_type == 4
                        ? "专卖店"
                        : "专营店"}
                    </Text>
                  ) : null} */}
                        <Text style={styles.promote_rate}>
                          全店推广
                          {/* {detail.mall.mall_rate} */}
                        </Text>
                      </View>
                    </View>

                    {/* <TouchableOpacity
                      activeOpacity={0.8}
                      // onPress={() => this.shopClick(detail.seller_id)}
                    >
                      <Text style={styles.shop_view}>进店逛逛</Text>
                    </TouchableOpacity> */}
                  </View>
                  {/* <FlatList
              style={styles.goodslist}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              data={detail.mall.goods}
              renderItem={this.renderItem}
              keyExtractor={keyExtractor}
            /> */}
                </View>
              ) : null}

              {/* 商品详情 */}
              <Text
                style={{
                  width: pxToDp(750),
                  color: "#1d1d1f",
                  fontWeight: "bold",
                  backgroundColor: "#fff",
                  marginTop: pxToDp(20),
                  fontSize: pxToDp(28),
                  paddingTop: pxToDp(15),
                  paddingLeft: pxToDp(30),
                }}
              >
                商品详情
              </Text>
              <Text style={styles.goods_desc}>
                {detail.goodsInfo.goods_desc}
              </Text>

              {/* 商品详情图片 */}
              <View>
                {imgList &&
                  imgList.map((item, index) => {
                    //cover: 等比例放大; center:不变; contain:不变; stretch:填充;
                    return (
                      <Image
                        key={index}
                        style={{
                          width: pxToDp(750),
                          height: pxToDp(750),
                        }}
                        source={{ uri: item }}
                      />
                    );
                  })}
              </View>

              {/* 相似商品 */}
              <View style={styles.recomand}>
                <Text style={styles.line} />
                <Image
                  style={styles.recomandlogo}
                  source={require("../image/mine_icon_commodity.png")}
                />
                <Text style={styles.recomandtitle}>相关商品</Text>
                <Text style={styles.line} />
              </View>
              {productList.length > 0 ? (
                <GoodsList
                  dataList={productList}
                  showload={true}
                  nomore={true}
                />
              ) : (
                <GoodsList dataList={undefined} showload={true} nomore={true} />
              )}
            </ScrollView>
          ) : (
            <LoadingActivity />
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                navigation.navigate("Home");
              }}
            >
              <View style={styles.home}>
                <Image
                  style={{ width: pxToDp(54), height: pxToDp(44) }}
                  source={require("../image/details_icon_home.png")}
                />
                <Text
                  style={{
                    fontSize: pxToDp(20),
                    color: "#9298a9",
                    marginTop: pxToDp(6),
                  }}
                >
                  首页
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.collect}
              onPress={() => {
                addtoCollections();
              }}
            >
              <Image
                style={{ width: pxToDp(54), height: pxToDp(44) }}
                source={
                  collected === 1
                    ? require("../image/details_icon_collect_n.png")
                    : require("../image/details_icon_collect_pre.png")
                }
              />
              <Text
                style={{
                  fontSize: pxToDp(20),
                  color: "#9298a9",
                  marginTop: pxToDp(6),
                }}
              >
                收藏
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => getGoodsBuyLink()}
            >
              {role != 1 || detail.coupon_info > 0 ? (
                <View style={styles.buyself}>
                  <Text style={{ color: "#fff", fontSize: pxToDp(28) }}>
                    ￥
                    {(role == 1
                      ? detail.coupon_discount
                      : role == 2
                      ? detail.coupon_discount + detail.promotion_price * 0.5
                      : detail.coupon_discount + detail.promotion_price
                    ).toFixed(2)}
                  </Text>
                  <Text style={{ color: "#fff", fontSize: pxToDp(30) }}>
                    购买省
                  </Text>
                </View>
              ) : (
                <Text style={styles.buyself}>购买</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setModalVisible(true);
              }}
            >
              {role != 1 ? (
                <LinearGradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  colors={["#FF5B28", "#FF1578"]}
                  style={styles.share_card}
                >
                  <Text style={{ color: "#fff", fontSize: pxToDp(28) }}>
                    ￥
                    {role == 2
                      ? (detail.promotion_price * 0.5).toFixed(2)
                      : (detail.promotion_price * 0.9).toFixed(2)}
                  </Text>
                  <Text style={{ color: "#fff", fontSize: pxToDp(30) }}>
                    分享赚
                  </Text>
                </LinearGradient>
              ) : (
                <LinearGradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  colors={["#FF5B28", "#FF1578"]}
                  style={styles.share_card}
                >
                  <Text style={{ color: "#fff", fontSize: pxToDp(30) }}>
                    分享
                  </Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
      {showLoading === true && (
        <View
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              opacity: 0.6,
              width: pxToDp(150),
              height: pxToDp(150),
              borderRadius: pxToDp(20),
              backgroundColor: "grey",
            }}
          >
            <LoadingActivity />
          </View>
        </View>
      )}
    </View>
  );
}
export default Detail;
// componentDidMount() {
//   let self = this;
//   const goods_id = self.props.navigation.getParam('goods_id', '');
//   const coupon_id = self.props.navigation.getParam('coupon_id', '');
//   if (goods_id) {
//     self.getData(goods_id, coupon_id);
//     self.addHistory(goods_id);
//     self.getSimilarGoods(goods_id);
//   }
//   console.log('------------', RNAlibcSdk);
//   RNAlibcSdk.initSDK((err) => {
//     if (!err) {
//       console.log('AlibcSdk init success');
//     } else {
//       console.error('AlibcSdk init fail:', err);
//     }
//   });
// }

// getData = async (goods_id, coupon_id) => {
//   const self = this;
//   const api = 'taobao_goods_detail';
//   const params = {
//     goods_id: goods_id,
//     coupon_id: coupon_id,
//   };
//   self.role = await AsyncStorage.getItem('role');
//   request(
//     api,
//     params,
//     function (res) {
//       console.log(res.data.data);
//       self.setState({
//         detail: res.data.data,
//         collected: res.data.data.is_collection,
//         imgList: res.data.data.small_images.string,
//       });
//     },
//     function (err) {
//       if (err.data.msg && err.data.msg.indexOf('50001') > 0) {
//         Toast.showWithGravity('商品已下架', Toast.LONG, Toast.CENTER);
//       } else {
//         Toast.showWithGravity(err.data.msg, Toast.SHORT, Toast.CENTER);
//       }
//     },
//   );
// };

// getSimilarGoods = (goods_id) => {
//   const self = this;
//   const api = 'taobao_goods_material_list';
//   const params = {
//     goods_id: goods_id,
//   };
//   request(api, params, function (res) {
//     self.setState({
//       productList: res.data.data,
//     });
//   });
// };

// addHistory = async (goods_id) => {
//   const id = String(goods_id);
//   const History = await AsyncStorage.getItem('browser_history');
//   let list = [];
//   if (History) {
//     list = History.split(',');
//   }
//   if (list.indexOf(id) < 0) {
//     list.unshift(id);
//   } else {
//     let index = list.indexOf(id);
//     list.splice(index, 1);
//     list.unshift(id);
//   }
//   AsyncStorage.setItem('browser_history', list.toString());
// };

// getUserPid() {
//   let self = this;
//   AsyncStorage.getItem('pid', function (error1, pid) {
//     if (!error1) {
//       self.setState({
//         pid: pid,
//       });
//     }
//   });
// }

// onScroll = () => {
//   const self = this;
//   if (!self.is_scroll) {
//     self.animate.play();
//     self.is_scroll = true;
//   }
//   if (self.index) {
//     clearTimeout(self.index);
//   }
//   self.index = setTimeout(function () {
//     self.is_scroll = false;
//     self.animate.pause();
//   }, 5000);
// };

// backHome = () => {
//   NavigationService.navigate('Home');
// };

// collectOrnot = (goods_id) => {
//   const self = this;
//   const api = 'collection_goods';
//   const params = {
//     goods_id: goods_id,
//   };
//   request(api, params, function (res) {
//     self.setState(
//       {
//         collected: res.data.is_collection,
//       },
//       Toast.showWithGravity(
//         self.state.collected ? '取消收藏成功' : '已加入收藏',
//         Toast.SHORT,
//         Toast.CENTER,
//       ),
//     );
//   });
// };

// buyByself = async (goods_id) => {
//   let params = {
//     mmpid: 'mm_1062890135_1461700083_110196400353',
//     adzoneid: '110196400353',
//     tkkey: '29171775',
//     opentype: 'auto',
//     isvcode: '',
//     itemid: String(goods_id),
//   };
//   RNAlibcSdk.show(
//     {
//       type: 'detail',
//       payload: params,
//     },
//     (err, info) => {
//       if (!err) {
//         console.log(info);
//       } else {
//         console.log(err);
//       }
//     },
//   );

// const parent_pid = await AsyncStorage.getItem("parent_pid");
// console.log("parent_pid", parent_pid);
// const self = this;
// const api = "goods_buy_now_info";
// const params = {
//   goods_id: goods_id,
//   promotion_pid: parent_pid
//   // custom_pid: self.data.custom_id,
//   // buy_type: self.data.is_share
// };
// request(api, params, function (res) {
//   self.app_url = res.data.data.app_uri;
//   self.web_url = res.data.data.mobile_url;
//   self.goToApp(self.app_url, self.web_url);
// });
// };

// shareToFriend = async (goods_id) => {
//   const self = this;
//   const pid = await AsyncStorage.getItem('pid');
//   const api = 'goods_detail_share_qrcode';
//   const params = {
//     goods_id: goods_id,
//     invite_pid: pid,
//     // custom_pid: self.data.custom_id,
//     // buy_type: self.data.is_share
//   };
//   self.getCopyContent(pid, goods_id);
//   Toast.showWithGravity('图片生成中,请稍后', Toast.LONG, Toast.CENTER);
//   request(api, params, function (res) {
//     // 图片
//     let pathName = new Date().getTime() + 'qrcode.jpg';
//     let downloadDest = `${RNFS.ExternalDirectoryPath}/${pathName}`;
//     const options = {
//       fromUrl: res.data.data,
//       toFile: downloadDest,
//       // progressDivider: 10,
//       // begin: res => {
//       // },
//       // progress: res => {
//       // }
//     };
//     // Platform.OS === "android";
//     RNFS.downloadFile(options)
//       .promise.then((res) => {
//         if (res && res.statusCode === 200) {
//           self.checkPermission(downloadDest);
//         }
//       })
//       .catch((err) => {
//         //下载出错时执行
//         console.log(err);
//       });
//   });
// };

// checkPermission = async (path) => {
//   try {
//     //返回string类型
//     const granted = await PermissionsAndroid.request(
//       PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
//     );
//     if (granted === PermissionsAndroid.RESULTS.GRANTED) {
//       CameraRoll.saveToCameraRoll(path)
//         .then((result) => {
//           Toast.showWithGravity(
//             '保存成功！地址如下：\n' + result,
//             Toast.LONG,
//             Toast.CENTER,
//           );
//           // alert("保存成功！地址如下：\n" + result);
//         })
//         .catch((error) => {
//           Toast.showWithGravity(
//             '保存失败！\n' + error,
//             Toast.SHORT,
//             Toast.CENTER,
//           );
//           // alert("保存失败！\n" + error);
//         });
//     } else {
//       Toast.showWithGravity(
//         '保存失败,请允许相关授权',
//         Toast.LONG,
//         Toast.CENTER,
//       );
//       console.log('获取读写权限失败');
//     }
//   } catch (err) {
//     console.log(err.toString());
//   }
// };

// shareUrlText = async (goods_id) => {
//   const pid = await AsyncStorage.getItem('pid');
//   const self = this;
//   self.getCopyContent(pid, goods_id);
//   WechatModule.shareMiniProgramToWx(
//     0,
//     WECHAT_MINI_KEY,
//     self.state.detail.goods_gallery_urls[0],
//     APP_BASE_URL,
//     '/pages/home/detail/detail?scene=' + goods_id + ',' + pid + ',1',
//     '【拼多多】' +
//       self.state.detail.coupon_discount +
//       '元优惠券，券后价￥' +
//       self.state.detail.discount_price +
//       '，原价￥' +
//       self.state.detail.price,
//     '',
//     WECHAT_MINI_TYPE,
//   );
// };

// getCopyContent = async (pid, goods_id) => {
//   const self = this;
//   const api = 'short_url';
//   const params = {
//     url:
//       APP_BASE_URL + '/api/to_pdd_goods_detail/' + goods_id + '/' + pid + '/',
//   };
//   await request(api, params, function (res) {
//     Clipboard.setString(
//       '【包邮】' +
//         self.state.detail.goods_name +
//         '\n' +
//         '价格:' +
//         self.state.detail.price +
//         '元' +
//         '\n' +
//         '券后价:' +
//         self.state.detail.discount_price +
//         '元' +
//         '\n' +
//         '商品链接:' +
//         res.data.short_url,
//     );
//   });
// };

// goToApp = (appurl, weburl) => {
//   console.log('打开APP');
//   Linking.canOpenURL(appurl)
//     .then((canOpen) => {
//       if (!canOpen) {
//         console.log('打开web url: ' + weburl);
//         NavigationService.push('WebPage', {url: weburl});
//       } else {
//         console.log('打开app url: ' + appurl);
//         return Linking.openURL(appurl).catch((err) =>
//           console.error('An error occurred', err),
//         );
//       }
//     })
//     .catch((err) => console.error('An error occurred', err));
// };

// shopClick = (shop_id) => {
//   NavigationService.push('Shop', {shop_id: shop_id});
// };

// goodsClick = (goods_id) => {
//   NavigationService.push('Detail', {goodsId: goods_id});
// };

// renderItem = ({item}) => {
//   return (
//     <TouchableOpacity
//       activeOpacity={0.9}
//       onPress={() => this.goodsClick(item.goods_id)}>
//       <View style={styles.other_goods}>
//         <Image
//           resizeMode="stretch"
//           source={{uri: item.image_url}}
//           style={styles.goods_img}
//         />
//         <Text numberOfLines={2} style={styles.goodsname}>
//           {item.goods_name}
//         </Text>
//         <View style={styles.down_price}>
//           <Text style={styles.price_title}>券后价</Text>
//           <Text style={{color: '#1d1d1f', fontSize: pxToDp(24)}}>
//             ￥{item.discount_price}
//           </Text>
//         </View>
//       </View>
//     </TouchableOpacity>
//   );
// };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f9",
  },
  sliders: {
    height: pxToDp(750),
  },
  platformlogo: {
    width: pxToDp(30),
    height: pxToDp(30),
  },
  dot: {
    width: pxToDp(16),
    height: pxToDp(16),
    backgroundColor: "#fff",
  },
  activedot: {
    width: pxToDp(16),
    height: pxToDp(16),
    backgroundColor: "#ff5186",
  },
  thumbnail: {
    width: pxToDp(750),
    height: pxToDp(750),
  },
  price: {
    flexDirection: "row",

    backgroundColor: "#fff",
    paddingTop: pxToDp(20),
    paddingLeft: pxToDp(30),
    paddingRight: pxToDp(30),
    paddingBottom: pxToDp(20),
    alignItems: "flex-end",
  },
  coupon: {
    flex: 1,
    flexDirection: "row",
    // alignItems: "flex-start",
    marginBottom: pxToDp(7),
    marginLeft: pxToDp(20),
    // justifyContent: 'flex-end',
    color: "#ffffff",
    fontSize: pxToDp(26),
  },
  shop_type: {
    fontSize: pxToDp(22),
    width: pxToDp(90),
    backgroundColor: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // lineHeight: pxToDp(30),
    borderWidth: pxToDp(4),
    borderColor: "#ff5186",
  },
  goods_name: {
    width: pxToDp(750),
    paddingLeft: pxToDp(30),
    paddingRight: pxToDp(30),
    paddingBottom: pxToDp(15),
    paddingTop: pxToDp(20),
    color: "#1d1d1f",
    backgroundColor: "#fff",
    fontSize: pxToDp(32),
  },
  shop_area: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: pxToDp(20),
    marginRight: pxToDp(30),
    paddingTop: pxToDp(20),
    paddingBottom: pxToDp(20),
  },
  shop_info: {
    flex: 1,
    marginLeft: pxToDp(20),
    // width:pxToDp(440)
  },
  shop_view: {
    width: pxToDp(143),
    height: pxToDp(42),
    color: "#848a99",
    textAlign: "center",
    lineHeight: pxToDp(42),
    fontSize: pxToDp(24),
    borderWidth: pxToDp(2),
    borderColor: "#848a99",
    borderTopRightRadius: pxToDp(22),
    borderBottomRightRadius: pxToDp(22),
    borderBottomLeftRadius: pxToDp(22),
    borderTopLeftRadius: pxToDp(22),
  },
  promote_rate: {
    width: pxToDp(150),
    height: pxToDp(32),
    textAlign: "center",
    lineHeight: pxToDp(32),
    backgroundColor: "#ffe7e1",
    color: "#ff4d00",
    fontSize: pxToDp(22),
    borderTopRightRadius: pxToDp(6),
    borderBottomRightRadius: pxToDp(6),
    borderBottomLeftRadius: pxToDp(6),
    borderTopLeftRadius: pxToDp(6),
  },
  goodslist: {
    marginLeft: pxToDp(20),
  },
  other_goods: {
    width: pxToDp(230),
    alignItems: "center",
  },
  goods_img: {
    width: pxToDp(210),
    height: pxToDp(210),
  },
  goodsname: {
    width: pxToDp(210),
    fontSize: pxToDp(24),
    color: "#3f4450",
    marginLeft: pxToDp(10),
    marginTop: pxToDp(15),
  },
  down_price: {
    flexDirection: "row",
    width: pxToDp(210),
    marginLeft: pxToDp(10),
    marginTop: pxToDp(5),
    marginBottom: pxToDp(15),
    alignItems: "center",
  },
  price_title: {
    color: "#4ac1a4",
    height: pxToDp(30),
    borderWidth: pxToDp(2),
    paddingLeft: pxToDp(8),
    paddingRight: pxToDp(2),
    fontSize: pxToDp(20),
    borderColor: "#4ac1a4",
    borderTopRightRadius: pxToDp(6),
    borderBottomRightRadius: pxToDp(6),
    borderBottomLeftRadius: pxToDp(6),
    borderTopLeftRadius: pxToDp(6),
  },
  goods_desc: {
    width: pxToDp(750),
    backgroundColor: "#fff",
    paddingLeft: pxToDp(30),
    paddingRight: pxToDp(30),
    paddingBottom: pxToDp(20),
    paddingTop: pxToDp(15),
    color: "#3f4450",
    lineHeight: pxToDp(40),
    fontSize: pxToDp(24),
  },
  recomand: {
    width: pxToDp(750),
    height: pxToDp(110),
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: pxToDp(20),
  },
  line: {
    width: pxToDp(230),
    height: pxToDp(1),
    margin: pxToDp(10),
    backgroundColor: "#ff4d00",
  },
  recomandlogo: {
    width: pxToDp(36),
    height: pxToDp(36),
    margin: pxToDp(14),
    color: "#ff4d00",
  },
  recomandtitle: {
    fontSize: pxToDp(32),
    color: "#ff4d00",
    marginRight: pxToDp(10),
  },
  footer: {
    position: "absolute",
    bottom: pxToDp(0),
    backgroundColor: "#fff",
    width: pxToDp(750),
    flexDirection: "row",
    height: pxToDp(100),
    // shadowColor: '#0400001a',
    // shadowOffset: {
    //   width: pxToDp(10),
    //   height: pxToDp(20)
    // }
  },
  home: {
    width: pxToDp(110),
    height: pxToDp(100),
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: pxToDp(2),
    borderRightColor: "#eaeaef",
    borderTopColor: "#0400001a",
    borderTopWidth: pxToDp(2),
  },
  collect: {
    width: pxToDp(110),
    height: pxToDp(100),
    alignItems: "center",
    justifyContent: "center",
    borderTopColor: "#0400001a",
    borderTopWidth: pxToDp(2),
  },
  share_picture: {
    backgroundColor: "#ffb426",
    width: pxToDp(190),
    height: pxToDp(100),
    color: "#fff",
    display: "flex",
    fontSize: pxToDp(28),
    textAlign: "center",
    lineHeight: pxToDp(100),
  },
  buyself: {
    backgroundColor: "#ff8f16",
    width: pxToDp(270),
    height: pxToDp(100),
    textAlign: "center",
    color: "#fff",
    lineHeight: pxToDp(100),
    fontSize: pxToDp(30),
    alignItems: "center",
    justifyContent: "center",
  },
  share_card: {
    backgroundColor: "#ff4d00",
    width: pxToDp(270),
    height: pxToDp(100),
    alignItems: "center",
    justifyContent: "center",
  },
  loadingArea: {
    height: pxToDp(120),
    marginTop: pxToDp(300),
    alignItems: "center",
    textAlign: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: pxToDp(36),
    marginTop: pxToDp(20),
  },
});

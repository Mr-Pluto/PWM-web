import axios from "axios"

import app from "@/main"
import sso from "@/utils/sso"
import cookie from "@/utils/cookie"

import store from "@/store"
import qs from 'qs'


var login_dialog_displayed = false;
var local_token = localStorage.getItem("token")

var token = cookie.get_cookie("token")

console.log("local", local_token)
console.log(token)

if (token) {
  localStorage.setItem("token", token)
} else {
  token = localStorage.getItem("token")
}


//export var baseURL = window.location.protocol + "//" + window.location.host + "/api/v1/"
export var baseURL = window.location.protocol + "//" + "10.50.182.65:888" + "/api/v1/"

export const params_serializer = (params) => {
  var param_list = []
  for (let k in params) {
    if (params[k] === "" || params[k] === null) {
      continue
    }
    if (params[k] instanceof Array) {
      for (let v of params[k]) {
        param_list.push(`${k}=${v}`)
      }
      continue
    }
    if (params[k] instanceof Date) {
      var date = params[k]
      param_list.push(`${k}=${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}T${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`)
      continue
    }
    param_list.push(`${k}=${params[k]}`)
  }
  return param_list.join("&")
}

export const filter_out_list_empty_str = (data) => {
  var new_data = []
  for (let item of data) {
    if (item instanceof Array) {
      new_data.push(filter_out_list_empty_str(item))
      continue
    }
    if (item instanceof Object) {
      new_data.push(filter_out_empty_str(item))
      continue
    }
    if (item === "") {
      continue
    }
    new_data.push(item)
  }
  return new_data
}

export const filter_out_empty_str = (data) => {
  var new_data = {};
  for (let i in data) {
    if (typeof i === "string" && i.startsWith("__")) {
      continue
    }
    if (data[i] instanceof Array) {
      new_data[i] = filter_out_list_empty_str(data[i])
      continue
    }
    if (data[i] instanceof Object) {
      new_data[i] = filter_out_empty_str(data[i])
      continue
    }
    if (data[i] === "") {
      continue
    }
    new_data[i] = data[i];
  }
  return new_data;
}

// var get_register = axios.create({
//   baseURL: baseURL,
//   target: baseURL,
//   timeout: 20000,
//   withCredentials: true, // 允许携带cookie
//   headers: {
//     "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
//     "Access-Control-Allow-Origin": "*",
//     "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
//   },
//   paramsSerializer: params_serializer,
//   withCredentials: true
// })


var master = axios.create({
  baseURL: baseURL,
  target: baseURL,
  timeout: 20000,
  withCredentials: true, // 允许携带cookie
  headers: {
    // "Content-Type":"application/x-www-form-urlencoded",
    // "deviceCode": "A95ZEF1-47B5-AC90BF3"
    // "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    // "Access-Control-Allow-Origin": "*",
    // "X-Frame-Options":"SAMEORIGIN",
    // "Content-Type":"application/json",
    // "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  },
  // paramsSerializer: params_serializer,
  withCredentials: true
});

master.interceptors.request.use(config => {
  config.headers.Authorization = store.state.token
  config.cancelToken = store.state.cancel_token.token
  config.data = filter_out_empty_str(config.data)
  if (config.method=='post' ){
    // config.data = qs.stringify(config.data);
    // config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    config.data = config.data;
    config.headers['Content-Type'] = 'application/json'
    config.headers['X-CSRFToken'] = this.getCookie('csrftoken')
  }
  return config
}, error => {
  return Promise.reject(error)
})

master.interceptors.response.use(response => {
  return response
}, error => {
  if (!error.response) {
    if (axios.isCancel(error)) {
      console.log("跳转取消")
      return Promise.reject(error)
    }
    if (error.message) {
      app.$message.error(error.message)
    } else {
      app.$message.error("unknow error")
    }
    return Promise.reject(error)
  }
  if (error.response.status == 401) {
    store.state.token = null
    console.log("app.$route.name:", app.$route.name)
    localStorage.removeItem("token")
    if (login_dialog_displayed || app.$route.name === "login") {
      return Promise.reject(error)
    }
    login_dialog_displayed = true
    app.$confirm('您的会话已过期', '前往登录？', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
      center: true
    }).then(() => {
      login_dialog_displayed = false
      app.$router.push({ name: "login", query: { next_path: app.$route.fullPath } })
    }).catch(() => {
      login_dialog_displayed = false
    });
    return Promise.reject(error)
  } else if (error.response.status >= 500) {
    app.$message.error("服务器出错啦 请联系管理员")
    return Promise.reject(error)
  }
  var data = error.response.data
  if (data.detail) {
    app.$message.error(data.detail)
  } else if (data.non_field_errors) {
    app.$message.error(String(data.non_field_errors).slice(0, 100))
  } else {
    app.$message.error(JSON.stringify(data).slice(0, 100))
  }
  return Promise.reject(error)

})


export default master
export const master_s = master

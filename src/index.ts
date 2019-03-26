import axios, { AxiosInstance } from 'axios';
import CryptoJS from 'crypto-js';

export class Client {
  private static BASE_URLS = {
    PRODUCTION: 'https://api.console.eyowo.com',
    SANDBOX: 'https://api.sandbox.developer.eyowo.com',
    STAGING: 'http://52.6.208.160:9193',
  };

  private static ENVIRONMENTS = {
    PRODUCTION: 'production',
    SANDBOX: 'sandbox',
    STAGING: 'staging',
  };

  private appSecret: string;

  private axiosInstance: AxiosInstance;

  constructor({ appKey, appSecret, environment }: IClientConstructor) {
    if (!appKey) {
      throw new Error('App key is required');
    }
    if (!appSecret) {
      throw new Error('App secret is required');
    }
    if (environment && !Object.values(Client.ENVIRONMENTS).includes(environment)) {
      throw new Error('Invalid environment');
    }

    let baseURL = Client.BASE_URLS.PRODUCTION;
    switch (environment) {
      case Client.ENVIRONMENTS.PRODUCTION:
        baseURL = Client.BASE_URLS.PRODUCTION;
        break;
      case Client.ENVIRONMENTS.SANDBOX:
        baseURL = Client.BASE_URLS.SANDBOX;
        break;
      case Client.ENVIRONMENTS.STAGING:
        baseURL = Client.BASE_URLS.STAGING;
        break;
      default:
        baseURL = Client.BASE_URLS.PRODUCTION;
        break;
    }

    this.appSecret = appSecret;
    const axiosInstance = axios.create({ baseURL });
    axiosInstance.defaults.headers.common['X-App-Key'] = appKey;
    this.axiosInstance = axiosInstance;
  }

  public async validateUser({ mobile }: IValidateUserReq) {
    return this.__makeRequest({
      messageData: { mobile },
      url: '/v1/users/auth/validate',
    });
  }

  public async authenticateUser({ mobile, factor, passcode }: IAuthenticateUserReq) {
    return this.__makeRequest({
      messageData: { mobile, factor, passcode },
      url: '/v1/users/auth',
    });
  }

  public async getBalance({ mobile, accessToken }: IGetUserBalanceReq) {
    return this.__makeRequest({
      accessToken,
      messageData: { mobile },
      url: '/v1/users/balance',
    });
  }

  public async transferToPhone({ accessToken, amount, mobile }: ITransferToPhoneReq) {
    return this.__makeRequest({
      accessToken,
      messageData: { mobile, amount },
      url: '/v1/users/transfers/phone',
    });
  }

  private async __makeRequest({ url, messageData, accessToken }: IMakeRequest) {
    const iv = CryptoJS.lib.WordArray.random(16).toString();
    const authData = CryptoJS.AES.encrypt(
      JSON.stringify(messageData),
      CryptoJS.enc.Base64.parse(this.appSecret),
      { iv: CryptoJS.enc.Base64.parse(iv) },
    ).toString();

    const headers: { [key: string]: string } = { 'X-IV': iv };
    if (accessToken) {
      headers['X-App-Wallet-Access-Token'] = accessToken;
    }
    return this.axiosInstance
      .post(url, { authData }, { headers })
      .then((data) => data.data)
      .catch((error) => {
        if (error.response) {
          return error.response.data;
        }
        throw error;
      });
  }
}

interface IClientConstructor {
  appKey: string;
  appSecret: string;
  environment?: string;
}

interface IMakeRequest {
  url: string;
  messageData: object;
  accessToken?: string;
}

interface IAuthenticateUserReq {
  mobile: string;
  factor: string;
  passcode?: string;
}

interface IValidateUserReq {
  mobile: string;
}

interface IGetUserBalanceReq {
  mobile: string;
  accessToken: string;
}

interface ITransferToPhoneReq {
  mobile: string;
  amount: number;
  accessToken: string;
}
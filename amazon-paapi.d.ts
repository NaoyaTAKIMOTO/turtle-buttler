declare module 'amazon-paapi' {
  interface CommonParameters {
    AccessKey: string;
    SecretKey: string;
    PartnerTag: string;
    PartnerType?: string;
    Marketplace?: string;
  }

  interface SearchItemsRequestParameters {
    Keywords: string;
    SearchIndex?: string;
    ItemCount?: number;
    Resources?: string[];
  }

  interface PaapiItem {
    ASIN?: string;
    DetailPageURL?: string;
    ItemInfo?: {
      Title?: {
        DisplayValue?: string;
        Label?: string;
        Locale?: string;
      };
      // Urls は ItemInfo の外にあるかもしれないので注意
      // DetailPageURL が Item 直下にある可能性も考慮
    };
    // SDKの構造によっては ItemInfo.Urls.Detail のようなパスになる
    // app.js のコードからは直接的な構造は読み取りにくい
    // kame_buttler.ts の既存コード item.ItemInfo.Urls.Detail.toString() をヒントにする
    // しかし、新しいSDKでは Item.DetailPageURL の方が一般的
  }

  interface PaapiResponse {
    SearchResult?: {
      Items?: PaapiItem[];
      TotalResultCount?: number;
      SearchURL?: string;
    };
    // エラーレスポンスの型も定義できると良い
    Errors?: Array<{
      Code?: string;
      Message?: string;
    }>;
  }

  export function SearchItems(
    commonParameters: CommonParameters,
    requestParameters: SearchItemsRequestParameters
  ): Promise<PaapiResponse>;

  // 他の関数も必要に応じて定義
  // export function GetItems(commonParameters: CommonParameters, requestParameters: any): Promise<PaapiResponse>;
  // export function GetBrowseNodes(commonParameters: CommonParameters, requestParameters: any): Promise<PaapiResponse>;
  // export function GetVariations(commonParameters: CommonParameters, requestParameters: any): Promise<PaapiResponse>;
}

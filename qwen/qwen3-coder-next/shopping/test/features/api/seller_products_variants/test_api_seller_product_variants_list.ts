import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_variants_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerLoginResult = await authorize_seller_join(sellerConnection, {
    body: sellerCredentials,
  });
  typia.assert(sellerLoginResult);
  // Login for subsequent requests
  const sellerLoginInfo = {
    email: sellerCredentials.email,
    password: sellerCredentials.password,
  } satisfies IShoppingMallSeller.ILogin;
  await authorize_seller_login(sellerConnection, {
    body: sellerLoginInfo,
  });
  // 2. Test default pagination (no filters)
  const defaultResponse =
    await api.functional.shoppingMall.seller.sellers.products.variants.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "pagination exists",
    defaultResponse.pagination !== null,
    true,
  );
  TestValidator.predicate("data exists", () =>
    Array.isArray(defaultResponse.data),
  );
  // 3. Test search by SKU code
  const skuSearchBody = {
    search: "TEST", // Sample search term
  } satisfies IShoppingMallProductVariant.IRequest;
  const skuSearchResponse =
    await api.functional.shoppingMall.seller.sellers.products.variants.index(
      sellerConnection,
      {
        body: skuSearchBody,
      },
    );
  typia.assert(skuSearchResponse);
  // 4. Test filter by stock status (in_stock)
  const inStockBody = {
    stockStatus: "in_stock",
    limit: 10,
  } satisfies IShoppingMallProductVariant.IRequest;
  const inStockResponse =
    await api.functional.shoppingMall.seller.sellers.products.variants.index(
      sellerConnection,
      {
        body: inStockBody,
      },
    );
  typia.assert(inStockResponse);
  TestValidator.predicate("in_stock filter works", () =>
    inStockResponse.data.every((v) => v.stock_quantity > 0),
  );
  // 5. Test filter by stock status (out_of_stock)
  const outOfStockBody = {
    stockStatus: "out_of_stock",
    limit: 10,
  } satisfies IShoppingMallProductVariant.IRequest;
  const outOfStockResponse =
    await api.functional.shoppingMall.seller.sellers.products.variants.index(
      sellerConnection,
      {
        body: outOfStockBody,
      },
    );
  typia.assert(outOfStockResponse);
  TestValidator.predicate("out_of_stock filter works", () =>
    outOfStockResponse.data.every((v) => v.stock_quantity === 0),
  );
  // 6. Test pagination with large result sets
  const paginationBody = {
    page: 1,
    limit: 2,
  } satisfies IShoppingMallProductVariant.IRequest;
  const paginationResponse =
    await api.functional.shoppingMall.seller.sellers.products.variants.index(
      sellerConnection,
      {
        body: paginationBody,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination limit respected",
    paginationResponse.data.length <= 2,
    true,
  );
  TestValidator.equals(
    "pagination metadata correct",
    paginationResponse.pagination.limit,
    2,
  );
}

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

export async function test_api_seller_product_variants_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  const authorized = await authorize_seller_login(sellerConnection, {
    body: {
      email:
        (sellerConnection.headers?.["x-authorization-email"] as string) ??
        typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(authorized);
  // Test 1: Seller with no products retrieves empty variant list
  const emptyResult =
    await api.functional.shoppingMall.seller.sellers.products.variants.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty product list returns empty data",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is zero",
    emptyResult.pagination.records,
    0,
  );
  // Test 2: Seller filters by non-matching SKU code (returns empty)
  const noMatchResult =
    await api.functional.shoppingMall.seller.sellers.products.variants.index(
      sellerConnection,
      {
        body: {
          search: "NONEXISTENT-SKU-CODE-12345",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "non-matching SKU returns empty data",
    noMatchResult.data.length,
    0,
  );
  // Test 3: Seller filters by stock status when all items are in_stock
  const inStockResult =
    await api.functional.shoppingMall.seller.sellers.products.variants.index(
      sellerConnection,
      {
        body: {
          stockStatus: "in_stock",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(inStockResult);
  // All variants should be in_stock since no products exist yet
  TestValidator.predicate(
    "in_stock filter returns empty when no products",
    inStockResult.data.length === 0 ||
      inStockResult.data.every((v) => v.stock_quantity > 0),
  );
  // Test 4: Seller pagination with page > total_pages (returns empty data array)
  const pageOverflowResult =
    await api.functional.shoppingMall.seller.sellers.products.variants.index(
      sellerConnection,
      {
        body: {
          page: 999,
          limit: 10,
        },
      },
    );
  typia.assert(pageOverflowResult);
  TestValidator.equals(
    "page overflow returns empty data",
    pageOverflowResult.data.length,
    0,
  );
  // Test 5: Seller requests limit > 100 (server enforces maximum)
  const limitOverflowResult =
    await api.functional.shoppingMall.seller.sellers.products.variants.index(
      sellerConnection,
      {
        body: {
          limit: 999, // Server should enforce maximum of 100
          page: 1,
        },
      },
    );
  typia.assert(limitOverflowResult);
  // Server enforces maximum limit, so result should be within bounds
  TestValidator.predicate(
    "limit overflow respects server maximum",
    limitOverflowResult.data.length <= 100,
  );
}
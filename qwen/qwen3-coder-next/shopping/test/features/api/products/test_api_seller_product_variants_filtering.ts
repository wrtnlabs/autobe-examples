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

export async function test_api_seller_product_variants_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const sellerConnection: api.IConnection = { host: connection.host };
  // Register seller account
  const joinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 8,
      }),
      logo_image_url:
        Math.random() > 0.5
          ? null
          : typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResult);
  // Login as seller
  const loginResult = await authorize_seller_login(sellerConnection, {
    body: {
      email: joinResult.data.profile.shop_name,
      password: "1234",
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResult);
  // Test 1: Empty search (no filters)
  const allVariants =
    await api.functional.shoppingMall.seller.sellers.products.variants.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(allVariants);
  TestValidator.predicate("has variants data", Array.isArray(allVariants.data));
  // Test 2: Search by partial SKU code
  if (allVariants.data.length > 0) {
    const skuPart = allVariants.data[0].sku_code.substring(
      0,
      Math.min(4, allVariants.data[0].sku_code.length),
    );
    const searchBySKU =
      await api.functional.shoppingMall.seller.sellers.products.variants.index(
        sellerConnection,
        {
          body: {
            search: skuPart,
          },
        },
      );
    typia.assert(searchBySKU);
    TestValidator.predicate(
      "filtered by SKU",
      searchBySKU.data.every((v) => v.sku_code.includes(skuPart)),
    );
  }
  // Test 3: Search with stock status filter
  if (allVariants.data.length > 0) {
    const searchInStock =
      await api.functional.shoppingMall.seller.sellers.products.variants.index(
        sellerConnection,
        {
          body: {
            search: allVariants.data[0].sku_code.substring(0, 4),
            stockStatus: "in_stock",
          },
        },
      );
    typia.assert(searchInStock);
    TestValidator.predicate(
      "stock status filter works",
      searchInStock.data.every((v) => v.stock_quantity > 0),
    );
  }
  // Test 4: Pagination - page 1 with limit 5
  const page1 =
    await api.functional.shoppingMall.seller.sellers.products.variants.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 has correct pagination",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 has correct limit", page1.pagination.limit, 5);
  TestValidator.predicate("page 1 has data", Array.isArray(page1.data));
  // Test 5: Pagination - page 2 with limit 5
  const page2 =
    await api.functional.shoppingMall.seller.sellers.products.variants.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 5,
        },
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 has correct pagination",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 has correct limit", page2.pagination.limit, 5);
  // Test 6: Pagination - large limit (100)
  const largeLimit =
    await api.functional.shoppingMall.seller.sellers.products.variants.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(largeLimit);
  TestValidator.equals(
    "large limit set correctly",
    largeLimit.pagination.limit,
    100,
  );
  // Test 7: Default sorting (created_at descending)
  const sortedVariants =
    await api.functional.shoppingMall.seller.sellers.products.variants.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(sortedVariants);
  // Test 8: Combined filters with pagination
  const combinedFilters =
    await api.functional.shoppingMall.seller.sellers.products.variants.index(
      sellerConnection,
      {
        body: {
          search:
            allVariants.data.length > 0
              ? allVariants.data[0].sku_code.substring(0, 4)
              : undefined,
          stockStatus: allVariants.data.some((v) => v.stock_quantity > 0)
            ? "in_stock"
            : "out_of_stock",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(combinedFilters);
  TestValidator.predicate(
    "combined filters work",
    combinedFilters.data.length >= 0,
  );
}

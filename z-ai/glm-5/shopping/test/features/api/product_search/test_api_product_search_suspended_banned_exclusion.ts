import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that product search correctly filters and returns results.
 *
 * This test verifies that the product search API works correctly and returns
 * products from active sellers. The full suspended/banned seller exclusion test
 * requires APIs to manage seller status (suspend/ban) which are not available
 * in the current API set.
 *
 * @param connection - Base API connection
 */
export async function test_api_product_search_suspended_banned_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // 1. Setup Administrator Connection
  // ========================================
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // ========================================
  // 2. Create Sellers
  // ========================================
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: `Shop A ${RandomGenerator.alphabets(5)}`,
    },
  });
  typia.assert(sellerA);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: `Shop B ${RandomGenerator.alphabets(5)}`,
    },
  });
  typia.assert(sellerB);
  const sellerCConnection: api.IConnection = { host: connection.host };
  const sellerC = await authorize_seller_join(sellerCConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: `Shop C ${RandomGenerator.alphabets(5)}`,
    },
  });
  typia.assert(sellerC);
  // ========================================
  // 3. Create Category via Administrator
  // ========================================
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: `Electronics ${RandomGenerator.alphabets(5)}`,
          description: "Electronic products for testing",
        },
      },
    );
  typia.assert(category);
  // ========================================
  // 4. Create Products Under Each Seller
  // ========================================
  const productX =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerAConnection,
      {
        body: {
          name: `Approved Product ${RandomGenerator.alphabets(3)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: category.id,
          basePrice: typia.random<
            number & typia.tags.Type<"uint32"> & typia.tags.Minimum<100>
          >(),
        },
      },
    );
  typia.assert(productX);
  const productY =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerBConnection,
      {
        body: {
          name: `Suspended Seller Product ${RandomGenerator.alphabets(3)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: category.id,
          basePrice: typia.random<
            number & typia.tags.Type<"uint32"> & typia.tags.Minimum<100>
          >(),
        },
      },
    );
  typia.assert(productY);
  const productZ =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerCConnection,
      {
        body: {
          name: `Banned Seller Product ${RandomGenerator.alphabets(3)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: category.id,
          basePrice: typia.random<
            number & typia.tags.Type<"uint32"> & typia.tags.Minimum<100>
          >(),
        },
      },
    );
  typia.assert(productZ);
  // ========================================
  // 5. Search Products
  // ========================================
  const searchResult = await api.functional.shoppingMall.products.search.index(
    connection,
    {
      body: {
        search: "Product",
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchResult);
  // ========================================
  // 6. Verify Search Results
  // ========================================
  const foundProductIds = searchResult.data.map((p) => p.id);
  // Verify created products are visible in search
  TestValidator.predicate(
    "Product X visible in search",
    foundProductIds.includes(productX.id),
  );
  TestValidator.predicate(
    "Product Y visible in search",
    foundProductIds.includes(productY.id),
  );
  TestValidator.predicate(
    "Product Z visible in search",
    foundProductIds.includes(productZ.id),
  );
  // Verify product details in search results
  const foundProductX = searchResult.data.find((p) => p.id === productX.id);
  if (foundProductX) {
    TestValidator.equals(
      "Product X seller ID matches",
      foundProductX.seller.id,
      sellerA.id,
    );
    TestValidator.predicate(
      "Seller has suspended=false",
      foundProductX.seller.suspended === false,
    );
    TestValidator.predicate(
      "Seller has banned=false",
      foundProductX.seller.banned === false,
    );
  }
  // Verify pagination metadata
  TestValidator.predicate(
    "Records count is positive",
    searchResult.pagination.records >= 3,
  );
}

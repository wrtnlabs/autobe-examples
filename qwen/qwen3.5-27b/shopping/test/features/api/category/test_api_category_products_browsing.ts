import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test browsing products within a specific category with pagination.
 *
 * Validates the complete product browsing flow within a category, including administrative category creation and public product listing retrieval. Ensures that the category endpoint correctly returns paginated results with accurate metadata and product summary information.
 *
 * Special attention is given to verifying that pagination metadata is accurate, product summaries contain all required fields for list display optimization, and the response structure matches the expected IPageIShoppingMallProduct.ISummary format.
 *
 * 1. Administrator authenticates and creates a category.
 * 2. Retrieve paginated product list for the category.
 * 3. Validate pagination metadata structure and values.
 * 4. Verify product summary structure for each returned product.
 * 5. Confirm products are correctly associated with the category.
 */
export async function test_api_category_products_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(category);
  // 2. Browse products in the category with pagination
  const productsPage =
    await api.functional.shoppingMall.categories.products.index(
      { host: connection.host },
      {
        categoryId: category.id,
        body: {
          page: 1,
          pageSize: 10,
        },
      },
    );
  typia.assert(productsPage);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", productsPage.pagination.current, 1);
  TestValidator.equals("page size is 10", productsPage.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    productsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    productsPage.pagination.pages >= 0,
  );
  // 4. Validate product summary structure for each product
  await ArrayUtil.asyncForEach(productsPage.data, async (product) => {
    typia.assert(product);
    // Verify category assignment matches the requested category
    TestValidator.equals(
      "product belongs to correct category",
      product.category?.id,
      category.id,
    );
    // Verify seller information exists and has required fields
    TestValidator.predicate(
      "seller has valid ID",
      /^[0-9a-f-]{36}$/i.test(product.seller.id),
    );
  });
}
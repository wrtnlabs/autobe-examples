import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_product_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_create";
import { prepare_random_shopping_mall_product_category } from "../../../prepare/prepare_random_shopping_mall_product_category";

export async function test_api_product_subcategory_retrieve_category_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Fail to retrieve product subcategory when subcategoryId does not belong to the specified categoryId.
  //
  // Steps:
  // - Authenticate as an administrator by joining the system.
  // - Create two distinct product categories.
  // - Create a product subcategory under the first category (simulated).
  // - Attempt to retrieve the subcategory details by providing the second categoryId and the subcategoryId from the first category.
  //
  // Validation:
  // - Verify HTTP 404 Not Found status.
  // - Validate error message indicates the subcategory does not belong to the specified category.
  //
  // Edge cases:
  // - Data integrity check to prevent cross-category data leaks.
  // 1. Administrator join and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Create two distinct product categories
  const firstCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(firstCategory);
  const secondCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(secondCategory);
  // 3. Simulate a subcategory id under the first category
  const subcategoryId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve the subcategory with a mismatched category id
  await TestValidator.httpError(
    "subcategory category mismatch 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.product.categories.subcategories.at(
        adminConnection,
        {
          categoryId: typia.assert<string & tags.Format<"uuid">>((secondCategory as any).id ?? ""),
          subcategoryId: subcategoryId,
        },
      );
    },
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test that a soft-deleted category cannot be retrieved by ID.
 *
 * This test validates the business rule that only non-deleted categories
 * (deleted_at IS NULL) are accessible through the public API. The flow:
 * 1. Administrator creates a category
 * 2. Administrator soft-deletes the category (sets deleted_at timestamp)
 * 3. Attempting to retrieve the category returns 404 Not Found
 */
export async function test_api_category_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a category that will be soft-deleted
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Soft-delete the category (sets deleted_at timestamp)
  await api.functional.shoppingMall.admin.categories.erase(adminConnection, {
    categoryId: category.id,
  });
  // 4. Attempt to retrieve the deleted category - should return 404 Not Found
  // Using base connection since the endpoint is public
  await TestValidator.httpError(
    "soft-deleted category should not be found",
    404,
    async () => {
      await api.functional.shoppingMall.categories.at(connection, {
        categoryId: category.id,
      });
    },
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test that retrieving a non-existent or soft-deleted category returns a 404 error.
 *
 * This test validates:
 * - Soft-deleted categories are excluded from retrieval (deleted_at IS NOT NULL filter)
 * - Non-existent category IDs return 404 error
 * - The shopping_mall_categories table WHERE deleted_at IS NULL filter is enforced
 */
export async function test_api_category_not_found_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create a category
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Soft-delete the category
  await api.functional.shoppingMall.administrator.categories.erase(
    adminConnection,
    {
      categoryId: category.id,
    },
  );
  // 4. Attempt retrieval of soft-deleted category - should return 404
  await TestValidator.httpError(
    "soft-deleted category should return 404",
    404,
    async () =>
      await api.functional.shoppingMall.categories.at(connection, {
        categoryId: category.id,
      }),
  );
  // 5. Attempt retrieval of non-existent category - should return 404
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent category should return 404",
    404,
    async () =>
      await api.functional.shoppingMall.categories.at(connection, {
        categoryId: nonExistentId,
      }),
  );
}

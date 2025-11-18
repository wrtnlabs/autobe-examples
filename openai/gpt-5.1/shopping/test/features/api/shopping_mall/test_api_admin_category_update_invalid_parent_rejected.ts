import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function test_api_admin_category_update_invalid_parent_rejected(
  connection: api.IConnection,
) {
  /**
   * Validate that admin category update rejects setting parent_id to a
   * non-existent category, preserving referential integrity, while allowing a
   * normal update with valid fields for the same category.
   *
   * Business flow implemented (adapted to available APIs):
   *
   * 1. Register an admin via POST /auth/admin/join to obtain an authenticated
   *    admin context on the shared connection.
   * 2. Create a baseline category C via POST /shoppingMall/admin/categories and
   *    capture its fields.
   * 3. Generate a random UUID that will be used as an invalid parent_id.
   * 4. Attempt to update C via PUT /shoppingMall/admin/categories/{categoryId}
   *    with IShoppingMallCategory.IUpdate where only parent_id is set to this
   *    random UUID. Expect the call to throw (constraint/validation error).
   * 5. Perform a second, valid update on C that changes a benign field such as
   *    name_en, confirming that the endpoint works when payload is valid and
   *    that we can still update the same category after the rejected parent
   *    change.
   */

  // 1. Admin join to get authenticated admin context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create baseline category C
  const createBody = typia.random<IShoppingMallCategory.ICreate>();

  const baselineCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallCategory>(baselineCategory);

  // 3. Generate a random UUID to use as invalid parent_id
  const invalidParentId = typia.random<string & tags.Format<"uuid">>();

  // 4. Attempt invalid parent update - must throw
  await TestValidator.error(
    "category update must reject non-existent parent_id",
    async () => {
      await api.functional.shoppingMall.admin.categories.update(connection, {
        categoryId: baselineCategory.id,
        body: {
          parent_id: invalidParentId,
        } satisfies IShoppingMallCategory.IUpdate,
      });
    },
  );

  // 5. Perform a valid update that changes a benign field, e.g., name_en
  const newName = `${baselineCategory.name_en}-updated`;

  const updatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryId: baselineCategory.id,
      body: {
        name_en: newName,
      } satisfies IShoppingMallCategory.IUpdate,
    });
  typia.assert<IShoppingMallCategory>(updatedCategory);

  // Validate that the name actually changed and id remained stable
  TestValidator.equals(
    "updated category id must equal baseline id",
    updatedCategory.id,
    baselineCategory.id,
  );

  TestValidator.notEquals(
    "updated category name_en must differ from baseline name_en",
    updatedCategory.name_en,
    baselineCategory.name_en,
  );

  TestValidator.equals(
    "updated category name_en matches newName",
    updatedCategory.name_en,
    newName,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate shopping mall category update process by an authenticated admin.
 *
 * 1. Register a new admin and authenticate (obtain token).
 * 2. As the admin, create an initial mall category (category1).
 * 3. As the admin, create a second mall category (category2) for possible parent
 *    assignment.
 * 4. Update category1: a. Change description. b. Change sort_order. c. Change
 *    status to 'inactive'. d. Re-assign parent to category2. e. Attempt to
 *    update system-managed fields (id/created_at) or name (should not modify
 *    these fields).
 * 5. After update, fetch the updated category and assert:
 *
 *    - The description, sort_order, status, and parent_id have changed accordingly.
 *    - Id, name, created_at, updated_at remain unchanged except for updated_at
 *         reflecting update.
 *    - System-managed fields are not modifiable by update.
 * 6. Attempt to reparent category1 to a non-existent parent_id and assert error is
 *    thrown.
 * 7. Attempt to update the name value (not allowed; should not be updated).
 */
export async function test_api_mall_category_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminName: string = RandomGenerator.name();
  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(authorizedAdmin);

  // 2. Create initial mall category (category1)
  const initialCategoryName: string = RandomGenerator.alphabets(8);
  const initialCategory =
    await api.functional.shoppingMall.admin.mallCategories.create(connection, {
      body: {
        name: initialCategoryName,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        sort_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
        parent_id: null,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(initialCategory);

  // 3. Create a potential parent category (category2)
  const parentCategoryName: string = RandomGenerator.alphabets(8);
  const parentCategory =
    await api.functional.shoppingMall.admin.mallCategories.create(connection, {
      body: {
        name: parentCategoryName,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        sort_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
        parent_id: null,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory);

  // 4. Update category1: change description, sort_order, status, and parent_id
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const newSortOrder = typia.random<number & tags.Type<"int32">>();
  const newStatus = "inactive";
  const newParentId = parentCategory.id;
  const updateBody = {
    description: newDescription,
    sort_order: newSortOrder,
    status: newStatus,
    parent_id: newParentId,
  } satisfies IShoppingMallCategory.IUpdate;
  const updatedCategory =
    await api.functional.shoppingMall.admin.mallCategories.update(connection, {
      name: initialCategory.name,
      body: updateBody,
    });
  typia.assert(updatedCategory);

  // 5. Assert updatable fields are changed, name/id/static fields are not
  TestValidator.equals(
    "updated description",
    updatedCategory.description,
    newDescription,
  );
  TestValidator.equals(
    "updated sort_order",
    updatedCategory.sort_order,
    newSortOrder,
  );
  TestValidator.equals("updated status", updatedCategory.status, newStatus);
  TestValidator.equals(
    "updated parent_id",
    updatedCategory.parent_id,
    newParentId,
  );
  TestValidator.equals(
    "id not changed",
    updatedCategory.id,
    initialCategory.id,
  );
  TestValidator.equals(
    "name not changed",
    updatedCategory.name,
    initialCategory.name,
  );
  TestValidator.equals(
    "created_at not changed",
    updatedCategory.created_at,
    initialCategory.created_at,
  );
  TestValidator.notEquals(
    "updated_at timestamp updated",
    updatedCategory.updated_at,
    initialCategory.updated_at,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updatedCategory.deleted_at,
    initialCategory.deleted_at ?? null,
  );

  // 6. Attempt to reparent category1 to a non-existent parent_id and assert error
  const nonexistentParentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "parent_id must refer to an existing category",
    async () => {
      await api.functional.shoppingMall.admin.mallCategories.update(
        connection,
        {
          name: initialCategory.name,
          body: {
            parent_id: nonexistentParentId,
          } satisfies IShoppingMallCategory.IUpdate,
        },
      );
    },
  );

  // 7. Attempt to update the name (not allowed, should have no effect)
  const attemptedNameChange = RandomGenerator.alphabets(9);
  // Provide a body with name (should be ignored because IUpdate does not allow 'name')
  // The API and type system will enforce that 'name' is not updatable
  // So this part should just confirm that an attempt to pass a name property is a type error (actually not possible at type level)
  // Therefore, there's nothing to do for name update, as IUpdate does not allow setting 'name'
}

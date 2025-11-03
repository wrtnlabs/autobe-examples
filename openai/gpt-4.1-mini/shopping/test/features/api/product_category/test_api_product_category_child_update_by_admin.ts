import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

export async function test_api_product_category_child_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePass123!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Simulate a root parent id since no direct root create API
  const rootParentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create a new parent category as a child of the root
  const parentCategoryBody = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    parent_id: null,
  } satisfies IShoppingMallProductCategory.ICreate;

  const parentCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.children.createChildCategory(
      connection,
      {
        parentId: rootParentId,
        body: parentCategoryBody,
      },
    );
  typia.assert(parentCategory);

  // 4. Create a child category under the created parent category
  const childCategoryBody = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_id: parentCategory.id,
  } satisfies IShoppingMallProductCategory.ICreate;

  const childCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.children.createChildCategory(
      connection,
      {
        parentId: parentCategory.id,
        body: childCategoryBody,
      },
    );
  typia.assert(childCategory);

  // 5. Update child category with new name and description
  const updateBody1 = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallProductCategory.IUpdate;

  const updatedChildCategory1: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.children.updateChildCategory(
      connection,
      {
        parentId: parentCategory.id,
        childId: childCategory.id,
        body: updateBody1,
      },
    );
  typia.assert(updatedChildCategory1);

  TestValidator.equals(
    "child category id unchanged after update",
    updatedChildCategory1.id,
    childCategory.id,
  );
  TestValidator.equals(
    "child category parent id unchanged after update",
    updatedChildCategory1.parent_id,
    parentCategory.id,
  );
  TestValidator.equals(
    "child category name updated",
    updatedChildCategory1.name,
    updateBody1.name,
  );

  // 6. Attempt to update child category with duplicate sibling name to test error
  const duplicateNameBody = {
    name: childCategory.name,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallProductCategory.IUpdate;

  await TestValidator.error(
    "update child category with duplicate sibling name fails",
    async () => {
      await api.functional.shoppingMall.admin.productCategories.children.updateChildCategory(
        connection,
        {
          parentId: parentCategory.id,
          childId: childCategory.id,
          body: duplicateNameBody,
        },
      );
    },
  );

  // 7. Attempt to update child with invalid parent id (child's own id) to check hierarchy integrity
  const invalidParentBody = {
    parent_id: childCategory.id,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallProductCategory.IUpdate;

  await TestValidator.error(
    "update child category with invalid parent throws error",
    async () => {
      await api.functional.shoppingMall.admin.productCategories.children.updateChildCategory(
        connection,
        {
          parentId: parentCategory.id,
          childId: childCategory.id,
          body: invalidParentBody,
        },
      );
    },
  );

  // 8. Update only description field with explicit null to test optional field
  const nullDescriptionBody = {
    name: RandomGenerator.name(2),
    description: null,
  } satisfies IShoppingMallProductCategory.IUpdate;

  const updatedChildCategory2: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.children.updateChildCategory(
      connection,
      {
        parentId: parentCategory.id,
        childId: childCategory.id,
        body: nullDescriptionBody,
      },
    );
  typia.assert(updatedChildCategory2);

  TestValidator.equals(
    "child category description set to null",
    updatedChildCategory2.description,
    null,
  );
}

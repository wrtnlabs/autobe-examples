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
  // Admin join for authenticated operations
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    full_name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // Create parent product category
  const parentCategoryCreateBody = {
    name: `Category-${RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 8 })}`,
    description: RandomGenerator.content({ paragraphs: 1 }),
    parent_id: null,
  } satisfies IShoppingMallProductCategory.ICreate;

  const parentCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.create(
      connection,
      { body: parentCategoryCreateBody },
    );
  typia.assert(parentCategory);

  // Create first child product category
  const childCategoryName1 = `Child-${RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 7 })}`;
  const childCategoryCreateBody1 = {
    name: childCategoryName1,
    description: RandomGenerator.content({ paragraphs: 1 }),
    parent_id: parentCategory.id,
  } satisfies IShoppingMallProductCategory.ICreate;

  const childCategory1: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.children.createChildCategory(
      connection,
      { parentId: parentCategory.id, body: childCategoryCreateBody1 },
    );
  typia.assert(childCategory1);

  // Create second child product category for uniqueness conflict test
  const childCategoryName2 = `Child-${RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 7 })}`;
  const childCategoryCreateBody2 = {
    name: childCategoryName2,
    description: RandomGenerator.content({ paragraphs: 1 }),
    parent_id: parentCategory.id,
  } satisfies IShoppingMallProductCategory.ICreate;

  const childCategory2: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.children.createChildCategory(
      connection,
      { parentId: parentCategory.id, body: childCategoryCreateBody2 },
    );
  typia.assert(childCategory2);

  // Update the first child category
  const updatedName = `Updated-${RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 })}`;
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });

  const updateBody = {
    name: updatedName,
    description: updatedDescription,
    parent_id: parentCategory.id,
  } satisfies IShoppingMallProductCategory.IUpdate;

  const updatedCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.children.updateChildCategory(
      connection,
      {
        parentId: parentCategory.id,
        childId: childCategory1.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);

  TestValidator.equals(
    "updated category name",
    updatedCategory.name,
    updatedName,
  );
  TestValidator.equals(
    "updated category description",
    updatedCategory.description,
    updatedDescription,
  );

  TestValidator.predicate(
    "updated_at later than created_at",
    new Date(updatedCategory.updated_at).getTime() >
      new Date(updatedCategory.created_at).getTime(),
  );

  // Validate uniqueness violation: try to update first child to second child's name
  await TestValidator.error("duplicate sibling name validation", async () => {
    const conflictUpdateBody: IShoppingMallProductCategory.IUpdate = {
      name: childCategoryName2,
      description: RandomGenerator.content({ paragraphs: 1 }),
      parent_id: parentCategory.id,
    };
    await api.functional.shoppingMall.admin.productCategories.children.updateChildCategory(
      connection,
      {
        parentId: parentCategory.id,
        childId: childCategory1.id,
        body: conflictUpdateBody,
      },
    );
  });

  // Validate unauthorized update
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update fails", async () => {
    const illegalUpdateBody = {
      name: `IllegalUpdate-${RandomGenerator.paragraph({ sentences: 1 })}`,
      description: null,
      parent_id: parentCategory.id,
    } satisfies IShoppingMallProductCategory.IUpdate;

    await api.functional.shoppingMall.admin.productCategories.children.updateChildCategory(
      unauthConn,
      {
        parentId: parentCategory.id,
        childId: childCategory1.id,
        body: illegalUpdateBody,
      },
    );
  });
}

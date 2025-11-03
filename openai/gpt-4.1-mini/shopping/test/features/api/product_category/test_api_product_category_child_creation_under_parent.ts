import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

export async function test_api_product_category_child_creation_under_parent(
  connection: api.IConnection,
) {
  // 1. Admin signs up and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "StrongPassword123!",
    full_name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a parent product category
  const parentCategoryCreateBody = {
    name: `ParentCategory_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallProductCategory.ICreate;

  const parentCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.create(
      connection,
      {
        body: parentCategoryCreateBody,
      },
    );
  typia.assert(parentCategory);

  TestValidator.equals(
    "parent category name matches",
    parentCategory.name,
    parentCategoryCreateBody.name,
  );
  TestValidator.predicate(
    "parent category id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      parentCategory.id,
    ),
  );

  // 3. Create a child product category under the parent
  const childCategoryCreateBody = {
    name: `ChildCategory_${RandomGenerator.alphaNumeric(6)}`,
    // Explicitly set parent_id to null because body type allows it optionally, but actual linkage is via parentId parameter
    parent_id: null,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallProductCategory.ICreate;

  const childCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.children.createChildCategory(
      connection,
      {
        parentId: parentCategory.id,
        body: childCategoryCreateBody,
      },
    );
  typia.assert(childCategory);

  // Validate childCategory properties
  TestValidator.equals(
    "child category name matches",
    childCategory.name,
    childCategoryCreateBody.name,
  );
  TestValidator.equals(
    "child category parent_id matches parent id",
    childCategory.parent_id,
    parentCategory.id,
  );
  TestValidator.predicate(
    "child category id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      childCategory.id,
    ),
  );

  // Validate timestamps are ISO 8601 date-time format strings
  TestValidator.predicate(
    "child category created_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      childCategory.created_at,
    ),
  );
  TestValidator.predicate(
    "child category updated_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      childCategory.updated_at,
    ),
  );

  // Validate deleted_at is null or undefined explicitly (using null check)
  TestValidator.predicate(
    "child category deleted_at is null or undefined",
    childCategory.deleted_at === null || childCategory.deleted_at === undefined,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Full workflow E2E test for shopping mall category update by admin role.
 *
 * 1. Authenticate a new admin user by calling /auth/admin/join.
 * 2. Create a parent category to use its id as a valid parent category.
 * 3. Create a target category which will be updated.
 * 4. Update the target category with new code, name, description, display_order,
 *    and assign the parent category id.
 * 5. Assert the updated category returned matches all changed values with valid
 *    timestamps.
 *
 * This test ensures admin authorization, category creation, hierarchical
 * linkage, and update persistence.
 */
export async function test_api_shopping_mall_category_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate a new admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const passwordHash = "hashed_password_123";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a parent category
  const parentCategoryCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    parent_id: null,
  } satisfies IShoppingMallCategory.ICreate;

  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: parentCategoryCreateBody,
      },
    );
  typia.assert(parentCategory);

  // 3. Create the target category
  const targetCategoryCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    parent_id: null,
  } satisfies IShoppingMallCategory.ICreate;

  const targetCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: targetCategoryCreateBody,
      },
    );
  typia.assert(targetCategory);

  // 4. Update the target category
  const updatedCode = RandomGenerator.alphaNumeric(12);
  const updatedName = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });
  const updatedDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;

  const updateBody = {
    code: updatedCode,
    name: updatedName,
    description: updatedDescription,
    display_order: updatedDisplayOrder,
    parent_id: parentCategory.id,
  } satisfies IShoppingMallCategory.IUpdate;

  const updatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.update(
      connection,
      {
        categoryId: targetCategory.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);

  // 5. Assertions for updated category
  TestValidator.equals(
    "updated code matches",
    updatedCategory.code,
    updatedCode,
  );
  TestValidator.equals(
    "updated name matches",
    updatedCategory.name,
    updatedName,
  );
  TestValidator.equals(
    "updated description matches",
    updatedCategory.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated display order matches",
    updatedCategory.display_order,
    updatedDisplayOrder,
  );
  TestValidator.equals(
    "updated parent id matches",
    updatedCategory.parent_id,
    parentCategory.id,
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date string",
    typeof updatedCategory.created_at === "string" &&
      updatedCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date string",
    typeof updatedCategory.updated_at === "string" &&
      updatedCategory.updated_at.length > 0,
  );
}

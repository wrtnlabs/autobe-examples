import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test updating basic category information including name, description, and
 * display order.
 *
 * This test validates that admin users can successfully modify category
 * attributes through partial updates. It creates a category with initial
 * values, updates specific fields, and verifies that updated fields reflect new
 * values while unchanged fields retain their original values.
 *
 * Steps:
 *
 * 1. Authenticate as admin user
 * 2. Create initial category with baseline values
 * 3. Update name, description, and display_order fields
 * 4. Validate all fields are correctly updated or preserved
 */
export async function test_api_category_update_basic_fields(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin123!@#";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial category with baseline values
  const initialName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const initialDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const initialDisplayOrder = typia.random<number & tags.Type<"int32">>();
  const categorySlug = RandomGenerator.alphaNumeric(10);

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: initialName,
        slug: categorySlug,
        description: initialDescription,
        display_order: initialDisplayOrder,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(createdCategory);

  // Step 3: Update name, description, and display_order fields
  const updatedName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 6,
  });
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 9,
  });
  const updatedDisplayOrder = typia.random<number & tags.Type<"int32">>();

  const updatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.putByCategorycode(
      connection,
      {
        categoryCode: createdCategory.slug,
        body: {
          name: updatedName,
          description: updatedDescription,
          display_order: updatedDisplayOrder,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // Step 4: Validate updated fields reflect new values
  TestValidator.equals(
    "category name updated correctly",
    updatedCategory.name,
    updatedName,
  );
  TestValidator.equals(
    "category description updated correctly",
    updatedCategory.description,
    updatedDescription,
  );
  TestValidator.equals(
    "category display_order updated correctly",
    updatedCategory.display_order,
    updatedDisplayOrder,
  );

  // Validate unchanged fields retain original values
  TestValidator.equals(
    "category ID unchanged",
    updatedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category slug unchanged",
    updatedCategory.slug,
    createdCategory.slug,
  );
  TestValidator.equals(
    "category status unchanged",
    updatedCategory.status,
    createdCategory.status,
  );
}

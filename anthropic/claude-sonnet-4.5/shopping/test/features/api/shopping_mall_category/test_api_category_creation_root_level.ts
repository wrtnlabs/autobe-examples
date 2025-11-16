import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test creating a new root-level category at the top of the taxonomy hierarchy.
 *
 * This test validates the fundamental workflow for establishing primary
 * taxonomy nodes by creating a category with no parent. Admin authenticates and
 * creates a category with all required fields (name, slug, display_order,
 * status) but with parent_id omitted or set to null.
 *
 * The test verifies that the category is created successfully with:
 *
 * 1. A generated UUID as the unique identifier
 * 2. Proper timestamps (created_at, updated_at)
 * 3. No parent relationship (parent_id is null, parent is undefined)
 * 4. Unique slug for SEO-friendly URLs
 * 5. All provided fields stored correctly
 * 6. Initial product_count of 0
 *
 * This establishes the foundation for building hierarchical product taxonomies
 * in the shopping mall marketplace.
 */
export async function test_api_category_creation_root_level(
  connection: api.IConnection,
) {
  // Step 1: Admin Authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdmin123!";

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

  // Step 2: Prepare Root Category Data
  const categoryData = {
    parent_id: null,
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<999>
    >(),
    status: RandomGenerator.pick(["active", "inactive"] as const),
  } satisfies IShoppingMallCategory.ICreate;

  // Step 3: Create Root-Level Category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 4: Validate Category Response Structure
  TestValidator.predicate(
    "category ID is a valid UUID",
    typia.is<string & tags.Format<"uuid">>(category.id),
  );

  // Step 5: Verify Root-Level Status (No Parent)
  TestValidator.equals(
    "parent_id should be null for root category",
    category.parent_id,
    null,
  );

  TestValidator.predicate(
    "parent should be undefined for root category",
    category.parent === undefined,
  );

  // Step 6: Validate Input Fields Match Response
  TestValidator.equals(
    "category name matches input",
    category.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category slug matches input",
    category.slug,
    categoryData.slug,
  );
  TestValidator.equals(
    "category description matches input",
    category.description,
    categoryData.description,
  );
  TestValidator.equals(
    "category image_url matches input",
    category.image_url,
    categoryData.image_url,
  );
  TestValidator.equals(
    "category display_order matches input",
    category.display_order,
    categoryData.display_order,
  );
  TestValidator.equals(
    "category status matches input",
    category.status,
    categoryData.status,
  );

  // Step 7: Validate System-Generated Fields
  TestValidator.predicate(
    "created_at is a valid ISO date-time",
    typia.is<string & tags.Format<"date-time">>(category.created_at),
  );

  TestValidator.predicate(
    "updated_at is a valid ISO date-time",
    typia.is<string & tags.Format<"date-time">>(category.updated_at),
  );

  TestValidator.equals(
    "initial product_count should be 0",
    category.product_count,
    0,
  );

  TestValidator.predicate(
    "deleted_at should be null or undefined for active category",
    category.deleted_at === null || category.deleted_at === undefined,
  );
}

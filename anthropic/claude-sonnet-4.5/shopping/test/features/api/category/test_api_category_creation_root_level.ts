import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test the creation of root-level product categories in the marketplace
 * taxonomy.
 *
 * This test validates that administrators can create top-level categories
 * without parent relationships, which form the foundation of the product
 * classification hierarchy in the shopping mall.
 *
 * Test workflow:
 *
 * 1. Admin authenticates via join endpoint to obtain admin privileges
 * 2. Admin creates a root-level category with parent_id set to null
 * 3. Validate all category properties are correctly initialized
 * 4. Verify system-managed fields (id, timestamps, product_count) are properly set
 * 5. Confirm category is created as root-level (parent_id is null)
 */
export async function test_api_category_creation_root_level(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to gain category management privileges
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: RandomGenerator.pick([
          "super_admin",
          "moderator",
          "support",
        ] as const),
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Prepare root-level category creation data
  const categoryName = RandomGenerator.paragraph({
    sentences: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
    >(),
    wordMin: 2,
    wordMax: 10,
  });

  const categorySlug = RandomGenerator.alphaNumeric(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<20>
    >(),
  );

  const categoryData = {
    parent_id: null,
    name: categoryName,
    slug: categorySlug,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<999>
    >(),
    status: RandomGenerator.pick(["active", "inactive"] as const),
  } satisfies IShoppingMallCategory.ICreate;

  // Step 3: Create the root-level category
  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(createdCategory);

  // Step 4: Validate category properties
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category slug matches input",
    createdCategory.slug,
    categoryData.slug,
  );
  TestValidator.equals(
    "parent_id is null for root-level category",
    createdCategory.parent_id,
    null,
  );
  TestValidator.equals(
    "display_order matches input",
    createdCategory.display_order,
    categoryData.display_order,
  );
  TestValidator.equals(
    "status matches input",
    createdCategory.status,
    categoryData.status,
  );
  TestValidator.equals(
    "product_count initialized to 0",
    createdCategory.product_count,
    0,
  );

  // Step 5: Verify system-managed fields are properly set
  TestValidator.predicate(
    "category ID is valid UUID",
    typia.is<string & tags.Format<"uuid">>(createdCategory.id),
  );

  TestValidator.predicate(
    "created_at is valid ISO 8601 timestamp",
    typia.is<string & tags.Format<"date-time">>(createdCategory.created_at),
  );

  TestValidator.predicate(
    "updated_at is valid ISO 8601 timestamp",
    typia.is<string & tags.Format<"date-time">>(createdCategory.updated_at),
  );

  // Step 6: Verify optional fields match input
  TestValidator.equals(
    "description matches input",
    createdCategory.description,
    categoryData.description,
  );
  TestValidator.equals(
    "image_url matches input",
    createdCategory.image_url,
    categoryData.image_url,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test retrieving a category with inactive status.
 *
 * This test validates that categories set to inactive status can still be
 * retrieved through the public API. It creates an inactive category and
 * retrieves it to ensure that visibility status does not prevent access,
 * maintaining data integrity for historical product references and
 * administrative operations.
 *
 * Steps:
 *
 * 1. Authenticate as admin to obtain permissions for category creation
 * 2. Create a category with inactive status
 * 3. Retrieve the created category by its slug
 * 4. Validate that the category is returned with inactive status and all data
 *    intact
 */
export async function test_api_category_retrieval_inactive_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category with inactive status
  const categorySlug = RandomGenerator.alphabets(8);
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    slug: categorySlug,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "inactive" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(createdCategory);

  // Step 3: Retrieve the created category by its slug
  const retrievedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.categories.getByCategorycode(connection, {
      categoryCode: categorySlug,
    });
  typia.assert(retrievedCategory);

  // Step 4: Validate the retrieved category
  TestValidator.equals(
    "category ID matches",
    retrievedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedCategory.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category slug matches",
    retrievedCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category status is inactive",
    retrievedCategory.status,
    "inactive",
  );
  TestValidator.equals(
    "category description matches",
    retrievedCategory.description,
    categoryData.description,
  );
  TestValidator.equals(
    "category image_url matches",
    retrievedCategory.image_url,
    categoryData.image_url,
  );
  TestValidator.equals(
    "category display_order matches",
    retrievedCategory.display_order,
    categoryData.display_order,
  );
  TestValidator.predicate(
    "product count is non-negative",
    retrievedCategory.product_count >= 0,
  );
}

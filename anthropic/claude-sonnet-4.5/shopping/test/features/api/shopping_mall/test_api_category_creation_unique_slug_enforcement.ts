import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test category creation unique slug enforcement.
 *
 * This test validates that the category creation endpoint enforces global slug
 * uniqueness constraint across all categories. It creates a category with a
 * specific slug, then attempts to create another category with the same slug to
 * verify that the system properly rejects duplicate slugs and prevents routing
 * conflicts.
 *
 * Steps:
 *
 * 1. Authenticate as admin user
 * 2. Create first category with a unique slug
 * 3. Attempt to create second category with the same slug
 * 4. Verify duplicate slug creation fails with appropriate error
 */
export async function test_api_category_creation_unique_slug_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create first category with a specific slug
  const uniqueSlug = `electronics-${RandomGenerator.alphaNumeric(8)}`;

  const firstCategoryData = {
    name: RandomGenerator.name(2),
    slug: uniqueSlug,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const firstCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: firstCategoryData,
    });
  typia.assert(firstCategory);

  // Verify first category was created successfully
  TestValidator.equals(
    "first category slug matches",
    firstCategory.slug,
    uniqueSlug,
  );

  // Step 3: Attempt to create second category with the same slug
  const secondCategoryData = {
    name: RandomGenerator.name(3),
    slug: uniqueSlug,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "inactive" as const,
  } satisfies IShoppingMallCategory.ICreate;

  // Step 4: Verify duplicate slug creation fails
  await TestValidator.error("duplicate slug should fail", async () => {
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: secondCategoryData,
    });
  });
}

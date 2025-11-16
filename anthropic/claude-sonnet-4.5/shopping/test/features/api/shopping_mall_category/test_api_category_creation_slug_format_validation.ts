import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test category creation with various slug formats to validate URL-friendly
 * identifier requirements.
 *
 * This test ensures that category slug validation works correctly by testing
 * both valid and invalid slug patterns. Valid slugs following
 * lowercase-with-hyphens pattern should be accepted, while slugs containing
 * spaces, special characters, or uppercase letters should be rejected.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin user
 * 2. Create categories with valid slug formats (lowercase, hyphens)
 * 3. Verify valid slugs are accepted
 * 4. Attempt to create categories with invalid slug formats
 * 5. Verify invalid slugs are rejected with validation errors
 */
export async function test_api_category_creation_slug_format_validation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test valid slug formats - these should succeed

  // Valid slug 1: Simple lowercase
  const category1Body = {
    name: "Electronics",
    slug: "electronics",
    display_order: 1,
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: category1Body,
    });
  typia.assert(category1);
  TestValidator.equals("category1 slug matches", category1.slug, "electronics");

  // Valid slug 2: Hyphenated multi-word
  const category2Body = {
    name: "Men's Clothing",
    slug: "mens-clothing",
    display_order: 2,
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category2: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: category2Body,
    });
  typia.assert(category2);
  TestValidator.equals(
    "category2 slug matches",
    category2.slug,
    "mens-clothing",
  );

  // Valid slug 3: Multi-hyphenated complex slug
  const category3Body = {
    name: "Smart Home Devices",
    slug: "smart-home-devices",
    display_order: 3,
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category3: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: category3Body,
    });
  typia.assert(category3);
  TestValidator.equals(
    "category3 slug matches",
    category3.slug,
    "smart-home-devices",
  );

  // Step 3: Test invalid slug formats - these should fail

  // Invalid slug 1: Contains spaces
  await TestValidator.error("slug with spaces should be rejected", async () => {
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Smart Home",
        slug: "smart home",
        display_order: 10,
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    });
  });

  // Invalid slug 2: Contains special characters
  await TestValidator.error(
    "slug with special characters should be rejected",
    async () => {
      await api.functional.shoppingMall.admin.categories.create(connection, {
        body: {
          name: "Home & Garden",
          slug: "home&garden",
          display_order: 11,
          status: "active" as const,
        } satisfies IShoppingMallCategory.ICreate,
      });
    },
  );

  // Invalid slug 3: Contains uppercase letters
  await TestValidator.error(
    "slug with uppercase letters should be rejected",
    async () => {
      await api.functional.shoppingMall.admin.categories.create(connection, {
        body: {
          name: "Electronics",
          slug: "Electronics",
          display_order: 12,
          status: "active" as const,
        } satisfies IShoppingMallCategory.ICreate,
      });
    },
  );
}

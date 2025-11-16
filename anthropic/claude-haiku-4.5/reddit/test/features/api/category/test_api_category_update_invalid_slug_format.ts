import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test validation of slug format constraints during category updates.
 *
 * Administrator creates a test category with a valid slug, then attempts to
 * update it with various invalid slug values including uppercase letters,
 * special characters, spaces, and other invalid patterns. The API should reject
 * all invalid slug updates and preserve the original valid slug, ensuring slug
 * format validation is properly enforced on updates.
 *
 * Test steps:
 *
 * 1. Administrator joins and authenticates
 * 2. Create a category with a valid slug
 * 3. Test update with uppercase letters in slug
 * 4. Test update with special characters in slug
 * 5. Test update with spaces in slug
 * 6. Test update with mixed invalid characters
 * 7. Verify original category slug is unchanged
 */
export async function test_api_category_update_invalid_slug_format(
  connection: api.IConnection,
) {
  // 1. Administrator joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/setup",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a category with a valid slug
  const validSlug = "technology-gadgets";
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology & Gadgets",
          slug: validSlug,
          description: "For tech enthusiasts and gadget lovers",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.equals("initial slug matches", category.slug, validSlug);

  // 3. Test update with uppercase letters in slug
  await TestValidator.error(
    "should reject uppercase letters in slug",
    async () => {
      await api.functional.communityPlatform.administrator.categories.update(
        connection,
        {
          categoryId: category.id,
          body: {
            slug: "Technology-Gadgets",
          } satisfies ICommunityPlatformCategory.IUpdate,
        },
      );
    },
  );

  // 4. Test update with special characters in slug
  await TestValidator.error(
    "should reject special characters in slug",
    async () => {
      await api.functional.communityPlatform.administrator.categories.update(
        connection,
        {
          categoryId: category.id,
          body: {
            slug: "technology@gadgets",
          } satisfies ICommunityPlatformCategory.IUpdate,
        },
      );
    },
  );

  // 5. Test update with spaces in slug
  await TestValidator.error("should reject spaces in slug", async () => {
    await api.functional.communityPlatform.administrator.categories.update(
      connection,
      {
        categoryId: category.id,
        body: {
          slug: "technology gadgets",
        } satisfies ICommunityPlatformCategory.IUpdate,
      },
    );
  });

  // 6. Test update with mixed invalid characters
  await TestValidator.error(
    "should reject mixed invalid characters in slug",
    async () => {
      await api.functional.communityPlatform.administrator.categories.update(
        connection,
        {
          categoryId: category.id,
          body: {
            slug: "Technology_Gadgets#2024!",
          } satisfies ICommunityPlatformCategory.IUpdate,
        },
      );
    },
  );

  // 7. Verify original category slug is unchanged
  const updatedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.update(
      connection,
      {
        categoryId: category.id,
        body: {
          name: "Tech & Electronics",
        } satisfies ICommunityPlatformCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  TestValidator.equals(
    "slug remains unchanged after invalid update attempts",
    updatedCategory.slug,
    validSlug,
  );
  TestValidator.notEquals(
    "name was successfully updated",
    updatedCategory.name,
    category.name,
  );
}

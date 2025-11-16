import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Tests community creation with category reference validation.
 *
 * Validates that community creation correctly handles category references,
 * including:
 *
 * - Successful community creation with valid active category_slug
 * - Failed creation with non-existent category_slug
 * - Correct transformation of category_slug FK to complete
 *   ICommunityPlatformCategory.ISummary object
 * - Rejection of communities referencing inactive categories
 *
 * This test ensures the FK pattern properly transforms external key references
 * (category_slug) into complete object references (category object) in the
 * response.
 */
export async function test_api_community_creation_category_reference(
  connection: api.IConnection,
) {
  // Setup: Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphabets(12),
      username: RandomGenerator.alphabets(10),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Setup: Create an active category for testing
  const activeCategorySlug = `${RandomGenerator.alphabets(8)}_active`;
  const activeCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: activeCategorySlug,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(activeCategory);
  TestValidator.equals(
    "active category is_active",
    activeCategory.is_active,
    true,
  );

  // Setup: Create an inactive category for negative testing
  const inactiveCategorySlug = `${RandomGenerator.alphabets(8)}_inactive`;
  const inactiveCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: inactiveCategorySlug,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 2,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(inactiveCategory);

  // Setup: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(12),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);

  // Test 1: Successful community creation with valid active category
  const communityName = RandomGenerator.paragraph({ sentences: 2 });
  const communityIdentifier = `${RandomGenerator.alphabets(5)}_${RandomGenerator.alphaNumeric(4)}`;

  const createdCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          identifier: communityIdentifier,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: activeCategorySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Validate: Community has complete category object (not just slug)
  TestValidator.equals(
    "category object is complete with id",
    typeof createdCommunity.category.id,
    "string",
  );
  TestValidator.equals(
    "category slug matches active category",
    createdCommunity.category.slug,
    activeCategorySlug,
  );
  TestValidator.equals(
    "category name is populated",
    createdCommunity.category.name,
    activeCategory.name,
  );
  TestValidator.equals(
    "category is_active is true",
    createdCommunity.category.is_active,
    true,
  );

  // Validate: Community creator is authenticated member
  TestValidator.equals(
    "community creator id matches member",
    createdCommunity.creator.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "community visibility is public",
    createdCommunity.visibility,
    "public",
  );
  TestValidator.equals(
    "community subscriber count starts at 1",
    createdCommunity.subscriber_count,
    1,
  );

  // Test 2: Failed community creation with non-existent category slug
  const nonExistentSlug = `nonexistent_${RandomGenerator.alphaNumeric(8)}`;

  await TestValidator.error(
    "creation fails with non-existent category_slug",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            identifier: `${RandomGenerator.alphabets(5)}_${RandomGenerator.alphaNumeric(4)}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: nonExistentSlug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Test 3: Failed community creation with inactive category
  await TestValidator.error(
    "creation fails with inactive category",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            identifier: `${RandomGenerator.alphabets(5)}_${RandomGenerator.alphaNumeric(4)}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: inactiveCategorySlug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
}

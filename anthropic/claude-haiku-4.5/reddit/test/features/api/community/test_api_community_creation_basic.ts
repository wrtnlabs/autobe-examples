import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test basic community creation with all required fields: name, identifier,
 * visibility, post_creation_restriction, post_type_restriction, and
 * category_slug. Verify that the community is created successfully with status
 * 201 and all provided values are correctly stored. Confirm that the response
 * includes complete community details including id (UUID), all settings,
 * timestamps (created_at, updated_at), subscriber_count (should be 1 for the
 * creator), post_count (0 for new community), and embedded category and creator
 * information. Validate that the authenticated member becomes the community
 * creator automatically.
 */
export async function test_api_community_creation_basic(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account to set up category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for community
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    slug: RandomGenerator.alphabets(8),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category slug matches",
    category.slug,
    categoryData.slug,
  );

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(10);
  const memberJoin: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberJoin);

  // Step 4: Create community with all required fields
  const communityName = RandomGenerator.paragraph({ sentences: 2 });
  const communityIdentifier = RandomGenerator.alphabets(8);
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });

  const communityData = {
    name: communityName,
    identifier: communityIdentifier,
    description: communityDescription,
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 5: Verify all required fields are correctly stored
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community description matches",
    community.description,
    communityDescription,
  );
  TestValidator.equals(
    "community visibility matches",
    community.visibility,
    "public",
  );
  TestValidator.equals(
    "post creation restriction matches",
    community.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "post type restriction matches",
    community.post_type_restriction,
    "all_types",
  );

  // Step 6: Verify community metrics and timestamps
  TestValidator.equals(
    "subscriber count is 1 for creator",
    community.subscriber_count,
    1,
  );
  TestValidator.equals("initial post count is 0", community.post_count, 0);
  TestValidator.equals(
    "initial comment count is 0",
    community.comment_count,
    0,
  );
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    () => !isNaN(Date.parse(community.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    () => !isNaN(Date.parse(community.updated_at)),
  );

  // Step 7: Verify embedded category information
  TestValidator.equals(
    "embedded category slug matches",
    community.category.slug,
    category.slug,
  );
  TestValidator.equals(
    "embedded category name matches",
    community.category.name,
    category.name,
  );

  // Step 8: Verify embedded creator information
  TestValidator.equals(
    "creator email matches member email",
    community.creator.email,
    memberEmail,
  );
  TestValidator.equals(
    "creator username matches member username",
    community.creator.username,
    memberUsername,
  );
  TestValidator.equals(
    "creator account status is active",
    community.creator.account_status,
    "active",
  );
  TestValidator.predicate(
    "creator karma score is non-negative",
    community.creator.karma_score >= 0,
  );
  TestValidator.predicate(
    "creator created_at is valid ISO datetime",
    () => !isNaN(Date.parse(community.creator.created_at)),
  );

  // Step 9: Verify community id is UUID format
  TestValidator.predicate(
    "community id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      community.id,
    ),
  );
}

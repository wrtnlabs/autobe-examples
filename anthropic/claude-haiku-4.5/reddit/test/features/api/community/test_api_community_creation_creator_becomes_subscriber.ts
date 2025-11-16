import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that community creator is automatically subscribed to their community
 * with full moderator permissions.
 *
 * When a member creates a community, they automatically become a subscriber
 * with full moderator permissions. This test validates:
 *
 * 1. Community is created successfully with initial settings
 * 2. Subscriber_count is 1 (only the creator)
 * 3. Creator appears as the community creator in the response
 * 4. Creator has full permissions to manage the community
 *
 * Workflow:
 *
 * 1. Create an administrator account to set up category
 * 2. Create a category for community classification
 * 3. Create a member account (community creator)
 * 4. Create a community with that member
 * 5. Verify subscriber_count equals 1
 * 6. Verify creator information matches the authenticated member
 * 7. Validate all community configuration settings
 */
export async function test_api_community_creation_creator_becomes_subscriber(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category creation
  const adminBody = {
    email: `admin_${RandomGenerator.alphabets(8)}@example.com`,
    password: "SecureAdminPass123!",
    username: `admin_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
    href: "https://example.com/admin",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAccount: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(adminAccount);

  // 2. Create a category for the community
  const categoryBody = {
    name: `Category_${RandomGenerator.alphabets(8)}`,
    slug: `category_${RandomGenerator.alphaNumeric(8)}`.toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 3. Create a member account (who will become the community creator)
  const memberBody = {
    email: `member_${RandomGenerator.alphabets(8)}@example.com`,
    username: `member_${RandomGenerator.alphaNumeric(6)}`,
    password: "SecureMemberPass123!",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAccount: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(memberAccount);

  // 4. Create a community with the member account
  const communityBody = {
    name: `Community_${RandomGenerator.alphabets(10)}`,
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`.toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(createdCommunity);

  // 5. Verify subscriber_count is 1 (only the creator)
  TestValidator.equals(
    "community subscriber_count should be 1 (only creator)",
    createdCommunity.subscriber_count,
    1,
  );

  // 6. Verify creator information matches the authenticated member
  TestValidator.equals(
    "community creator ID matches authenticated member ID",
    createdCommunity.creator.id,
    memberAccount.id,
  );

  TestValidator.equals(
    "community creator username matches registered member username",
    createdCommunity.creator.username,
    memberBody.username,
  );

  TestValidator.equals(
    "community creator email matches registered member email",
    createdCommunity.creator.email,
    memberBody.email,
  );

  // 7. Validate all community configuration settings
  TestValidator.equals(
    "community name matches request",
    createdCommunity.name,
    communityBody.name,
  );

  TestValidator.equals(
    "community identifier matches request",
    createdCommunity.identifier,
    communityBody.identifier,
  );

  TestValidator.equals(
    "community visibility matches request",
    createdCommunity.visibility,
    "public",
  );

  TestValidator.equals(
    "community post_creation_restriction matches request",
    createdCommunity.post_creation_restriction,
    "open_to_all",
  );

  TestValidator.equals(
    "community post_type_restriction matches request",
    createdCommunity.post_type_restriction,
    "all_types",
  );

  TestValidator.equals(
    "community category slug matches request",
    createdCommunity.category.slug,
    category.slug,
  );

  // 8. Verify initial post and comment counts are 0
  TestValidator.equals(
    "new community should have 0 posts",
    createdCommunity.post_count,
    0,
  );

  TestValidator.equals(
    "new community should have 0 comments",
    createdCommunity.comment_count,
    0,
  );

  // 9. Verify community timestamps are set
  TestValidator.predicate(
    "community created_at should be set",
    createdCommunity.created_at !== null &&
      createdCommunity.created_at !== undefined,
  );

  TestValidator.predicate(
    "community updated_at should be set",
    createdCommunity.updated_at !== null &&
      createdCommunity.updated_at !== undefined,
  );

  // 10. Verify creator has expected account properties
  TestValidator.equals(
    "creator account_status should be active",
    createdCommunity.creator.account_status,
    "active",
  );

  TestValidator.predicate(
    "creator karma_score should be non-negative",
    createdCommunity.creator.karma_score >= 0,
  );

  TestValidator.predicate(
    "creator email_verified status is set",
    typeof createdCommunity.creator.email_verified === "boolean",
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful community creation with all valid parameters.
 *
 * This test validates the complete workflow of authenticated member account
 * creation and community creation with valid parameters. It tests:
 *
 * 1. Administrator setup - Create an administrator account
 * 2. Category creation - Create a community category for classification
 * 3. Member authentication - Register a new member account
 * 4. Community creation - Create a community with valid parameters
 * 5. Response validation - Verify all community metadata and creator information
 * 6. Business rule validation - Ensure creator subscription and proper
 *    categorization
 */
export async function test_api_community_creation_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create a community category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(8)}`,
          description: "Technology and programming discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `user_${RandomGenerator.alphaNumeric(8)}`,
      password: memberPassword,
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Create community with valid parameters
  const communityIdentifier = `comm_${RandomGenerator.alphaNumeric(12)}`;
  const communityName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const communityDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          identifier: communityIdentifier,
          description: communityDescription,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Validate response structure and metadata
  TestValidator.equals(
    "community identifier matches request",
    community.identifier,
    communityIdentifier,
  );

  TestValidator.equals(
    "community name matches request",
    community.name,
    communityName,
  );

  TestValidator.equals(
    "community description matches request",
    community.description,
    communityDescription,
  );

  TestValidator.equals(
    "community visibility is public",
    community.visibility,
    "public",
  );

  TestValidator.equals(
    "community post creation is open to all",
    community.post_creation_restriction,
    "open_to_all",
  );

  TestValidator.equals(
    "community post type restriction allows all types",
    community.post_type_restriction,
    "all_types",
  );

  // 6. Validate category association
  TestValidator.equals(
    "community category slug matches",
    community.category.slug,
    category.slug,
  );

  TestValidator.equals(
    "community category name matches",
    community.category.name,
    category.name,
  );

  // 7. Validate creator information
  TestValidator.equals(
    "community creator email matches member email",
    community.creator.email,
    memberEmail,
  );

  TestValidator.equals(
    "community creator account status is active",
    community.creator.account_status,
    "active",
  );

  // 8. Validate metrics
  TestValidator.equals(
    "subscriber count is 1 (creator)",
    community.subscriber_count,
    1,
  );

  TestValidator.equals("post count is 0", community.post_count, 0);

  TestValidator.equals("comment count is 0", community.comment_count, 0);

  // 9. Validate timestamps exist and are properly formatted
  TestValidator.predicate(
    "created_at timestamp is set",
    community.created_at !== null && community.created_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at timestamp is set",
    community.updated_at !== null && community.updated_at !== undefined,
  );

  TestValidator.predicate(
    "deleted_at is not set",
    community.deleted_at === null || community.deleted_at === undefined,
  );

  // 10. Validate IDs are properly set
  TestValidator.predicate(
    "community has valid id",
    community.id !== null &&
      community.id !== undefined &&
      community.id.length > 0,
  );

  TestValidator.predicate(
    "creator has valid id",
    community.creator.id !== null &&
      community.creator.id !== undefined &&
      community.creator.id.length > 0,
  );
}

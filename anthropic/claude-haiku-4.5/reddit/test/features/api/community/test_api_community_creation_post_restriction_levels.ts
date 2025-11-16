import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community creation with different post creation restriction levels.
 *
 * This test validates that communities can be created with various
 * post_creation_restriction settings and that these settings are properly
 * persisted in the system.
 *
 * The test scenario:
 *
 * 1. Set up authentication as a member user who can create communities
 * 2. Create an administrator and a category (required for community creation)
 * 3. Create communities with each post_creation_restriction level:
 *
 *    - Open_to_all: Anyone can create posts
 *    - Moderators_only: Only moderators can create posts
 *    - Approved_members_only: Only approved members can create posts
 *    - Karma_requirement: Users must have minimum karma to create posts
 *    - Account_age_requirement: Users must have account older than X days
 * 4. Verify each community returns HTTP 201
 * 5. Confirm the restriction level is correctly stored and returned in the
 *    response
 * 6. Validate that each community maintains independent configuration
 */
export async function test_api_community_creation_post_restriction_levels(
  connection: api.IConnection,
) {
  // Setup phase: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Create a category required for community creation
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Technology and software discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup phase: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphabets(12),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Test data: Array of restriction levels to test
  const restrictionLevels = [
    "open_to_all",
    "moderators_only",
    "approved_members_only",
    "karma_requirement",
    "account_age_requirement",
  ] as const;

  // Test each post_creation_restriction level
  const createdCommunities: ICommunityPlatformCommunity[] = [];

  for (const restrictionLevel of restrictionLevels) {
    const identifier = `comm_${restrictionLevel}_${RandomGenerator.alphaNumeric(6)}`;
    const community =
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: `Community for ${restrictionLevel}`,
            identifier: identifier,
            description: `Test community with ${restrictionLevel} restriction`,
            visibility: "public",
            post_creation_restriction:
              restrictionLevel as ICommunityPlatformCommunity.ICreate["post_creation_restriction"],
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(community);
    createdCommunities.push(community);

    // Verify the restriction level is correctly stored
    TestValidator.equals(
      `post_creation_restriction for ${restrictionLevel} should match request`,
      community.post_creation_restriction,
      restrictionLevel as ICommunityPlatformCommunity.ICreate["post_creation_restriction"],
    );

    // Verify community was created successfully with all expected fields
    TestValidator.predicate(
      `community with ${restrictionLevel} should have valid ID`,
      () =>
        community.id !== null &&
        community.id !== undefined &&
        community.id.length > 0,
    );

    TestValidator.equals(
      `community identifier should match request for ${restrictionLevel}`,
      community.identifier,
      identifier,
    );

    TestValidator.equals(
      `community visibility should be public`,
      community.visibility,
      "public",
    );

    TestValidator.equals(
      `community category should match created category`,
      community.category.slug,
      category.slug,
    );
  }

  // Verify all communities were created
  TestValidator.equals(
    "all restriction levels should have created communities",
    createdCommunities.length,
    restrictionLevels.length,
  );

  // Verify each community has independent configuration
  for (let i = 0; i < createdCommunities.length; i++) {
    for (let j = i + 1; j < createdCommunities.length; j++) {
      TestValidator.notEquals(
        `community ${i} and ${j} should have different restriction levels`,
        createdCommunities[i].post_creation_restriction,
        createdCommunities[j].post_creation_restriction,
      );

      TestValidator.notEquals(
        `community ${i} and ${j} should have different identifiers`,
        createdCommunities[i].identifier,
        createdCommunities[j].identifier,
      );
    }
  }

  // Verify community metrics are initialized
  for (const community of createdCommunities) {
    TestValidator.predicate(
      `subscriber_count should be at least 1 (creator auto-subscribed)`,
      community.subscriber_count >= 1,
    );

    TestValidator.equals(
      `initial post_count should be 0`,
      community.post_count,
      0,
    );

    TestValidator.equals(
      `initial comment_count should be 0`,
      community.comment_count,
      0,
    );
  }
}

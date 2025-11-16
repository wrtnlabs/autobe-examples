import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test creation of communities with various post creation restrictions.
 *
 * This test validates that communities can be created with different
 * post_creation_restriction values (open_to_all, moderators_only,
 * approved_members_only, karma_requirement, account_age_requirement). It
 * verifies that each restriction type is properly stored and that the system
 * respects posted content governance policies.
 *
 * Test flow:
 *
 * 1. Create an administrator account to set up category
 * 2. Create a category for community classification
 * 3. Create a member account to create communities
 * 4. Create communities with each post creation restriction type
 * 5. Validate that each community stores the correct restriction value
 * 6. Verify the complete community data including restriction settings
 */
export async function test_api_community_creation_post_restrictions(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "General Discussion",
          slug: "general_discussion",
          description: "A category for testing post restriction policies",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create communities with different post creation restrictions
  const restrictions = [
    "open_to_all",
    "moderators_only",
    "approved_members_only",
    "karma_requirement",
    "account_age_requirement",
  ] as const;

  const communities: ICommunityPlatformCommunity[] = [];

  for (let index = 0; index < restrictions.length; index++) {
    const restriction = restrictions[index];
    // Use simple numeric identifiers to ensure compliance with 3-32 character limit
    const communityIdentifier = `com_${index + 1}_${RandomGenerator.alphaNumeric(4)}`;
    const communityName = `Community - ${restriction}`;

    const community: ICommunityPlatformCommunity =
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: communityName,
            identifier: communityIdentifier,
            description: `Testing ${restriction} post creation restriction policy`,
            visibility: "public",
            post_creation_restriction: restriction,
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(community);
    communities.push(community);

    // Validate that the restriction is properly stored
    TestValidator.equals(
      `community with ${restriction} restriction stores correct restriction value`,
      community.post_creation_restriction,
      restriction,
    );

    // Validate community basic properties
    TestValidator.equals(
      `community identifier matches for ${restriction}`,
      community.identifier,
      communityIdentifier,
    );
    TestValidator.equals(
      `community name matches for ${restriction}`,
      community.name,
      communityName,
    );
    TestValidator.equals(
      `community visibility is public for ${restriction}`,
      community.visibility,
      "public",
    );

    // Validate that category is properly assigned
    TestValidator.equals(
      `category slug matches for ${restriction}`,
      community.category.slug,
      category.slug,
    );

    // Validate that creator is the authenticated member
    TestValidator.equals(
      `creator ID matches authenticated member for ${restriction}`,
      community.creator.id,
      member.id,
    );

    // Validate initial community metrics
    TestValidator.equals(
      `subscriber count is 1 (creator) for ${restriction}`,
      community.subscriber_count,
      1,
    );
    TestValidator.equals(
      `post count is 0 for newly created ${restriction}`,
      community.post_count,
      0,
    );
    TestValidator.equals(
      `comment count is 0 for newly created ${restriction}`,
      community.comment_count,
      0,
    );
  }

  // Step 5: Verify all restrictions were created
  TestValidator.equals(
    "all five post restriction types were created",
    communities.length,
    5,
  );

  // Step 6: Verify each community has the correct post type restriction
  for (let i = 0; i < communities.length; i++) {
    TestValidator.equals(
      `post_type_restriction is all_types for community ${i + 1}`,
      communities[i].post_type_restriction,
      "all_types",
    );
  }
}

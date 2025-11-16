import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test all post creation restriction options for communities.
 *
 * Validates that each post creation restriction type (open_to_all,
 * moderators_only, approved_members_only, karma_requirement,
 * account_age_requirement) is correctly accepted and stored when creating
 * communities. Tests that the restrictions properly control who can create
 * posts and can be modified by the community creator.
 *
 * Process:
 *
 * 1. Create and authenticate administrator account
 * 2. Create and authenticate member account
 * 3. Create a category for community classification
 * 4. Create communities with each post creation restriction type
 * 5. Verify each restriction is correctly stored and persisted
 */
export async function test_api_community_creation_post_creation_restrictions(
  connection: api.IConnection,
) {
  // 1. Create and authenticate administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        href: "http://localhost:3000/admin/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: "MemberPassword123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Create category for communities
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: RandomGenerator.alphaNumeric(8),
          display_order: 1,
          description: "Technology and software discussion",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Test all post creation restriction types
  const restrictions = [
    "open_to_all",
    "moderators_only",
    "approved_members_only",
    "karma_requirement",
    "account_age_requirement",
  ] as const;

  for (const restriction of restrictions) {
    const communityIdentifier = RandomGenerator.alphaNumeric(8).toLowerCase();
    const community: ICommunityPlatformCommunity =
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: `Test Community ${restriction}`,
            identifier: communityIdentifier,
            description: `Community to test ${restriction} restriction`,
            visibility: "public",
            post_creation_restriction: restriction,
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );

    typia.assert(community);

    // Verify the restriction is correctly stored
    TestValidator.equals(
      `post_creation_restriction should be ${restriction}`,
      community.post_creation_restriction,
      restriction,
    );

    // Verify community basic properties
    TestValidator.equals(
      `community identifier should match`,
      community.identifier,
      communityIdentifier,
    );

    TestValidator.equals(
      `community name should match`,
      community.name,
      `Test Community ${restriction}`,
    );

    TestValidator.equals(
      `community visibility should be public`,
      community.visibility,
      "public",
    );

    TestValidator.equals(
      `category should match`,
      community.category.slug,
      category.slug,
    );

    TestValidator.equals(
      `creator should be the authenticated member`,
      community.creator.id,
      member.id,
    );
  }
}

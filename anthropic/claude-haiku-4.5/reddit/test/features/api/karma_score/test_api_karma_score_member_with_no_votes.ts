import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test karma score retrieval for a newly created member with no votes.
 *
 * Validates the initial state of a member's karma score immediately after
 * account creation. This ensures that new members start with zero karma across
 * all categories (posts, comments, total).
 *
 * Workflow:
 *
 * 1. Create administrator account for platform setup
 * 2. Create a category to enable community creation
 * 3. Create a member account (test subject) with no votes
 * 4. Create a community to establish member presence
 * 5. Retrieve karma score for the newly created member
 * 6. Verify all karma metrics are initialized to 0
 * 7. Validate that member association is correct
 */
export async function test_api_karma_score_member_with_no_votes(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = "AdminPassword123!";
  const adminAccount: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: `Admin ${RandomGenerator.name()}`,
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAccount);

  // Switch to admin connection for category creation
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: adminAccount.token.access,
    },
  };

  // Step 2: Create a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: `Category ${RandomGenerator.name()}`,
          slug: `category-${RandomGenerator.alphaNumeric(8)}`,
          description: `Test category for karma score validation`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (test subject)
  const memberEmail = `member-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberPassword = "MemberPassword123!";
  const memberAccount: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        password: memberPassword,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAccount);

  // Switch to member connection
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: memberAccount.token.access,
    },
  };

  // Step 4: Create a community to establish member presence
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: `Community ${RandomGenerator.name()}`,
          identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
          description: `Test community for karma score validation`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Retrieve karma score for the newly created member
  const karmaScore: ICommunityPlatformKarmaScore =
    await api.functional.communityPlatform.member.members.karmaScores.at(
      memberConnection,
      {
        memberId: memberAccount.id,
      },
    );
  typia.assert(karmaScore);

  // Step 6: Validate karma score is zero for new member with no votes
  TestValidator.equals(
    "post_karma should be 0 for new member",
    karmaScore.post_karma,
    0,
  );
  TestValidator.equals(
    "comment_karma should be 0 for new member",
    karmaScore.comment_karma,
    0,
  );
  TestValidator.equals(
    "total_karma should be 0 (sum of post_karma + comment_karma)",
    karmaScore.total_karma,
    0,
  );

  // Step 7: Verify karma score record belongs to correct member
  TestValidator.equals(
    "karma score member_id matches created member",
    karmaScore.community_platform_member_id,
    memberAccount.id,
  );
}

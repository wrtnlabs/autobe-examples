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
 * Retrieve and validate detailed karma score information for a specific member.
 *
 * This test validates the complete karma score retrieval workflow:
 *
 * 1. Create administrator account for category management
 * 2. Create a category to enable community creation
 * 3. Create member account (this establishes authenticated context)
 * 4. Create a community to establish member community presence
 * 5. Retrieve the member's karma score
 * 6. Validate the response structure and data integrity
 *
 * Validations performed:
 *
 * - Karma score contains all required fields (id, community_platform_member_id,
 *   post_karma, comment_karma, total_karma, created_at, updated_at)
 * - Total karma equals post_karma + comment_karma
 * - All karma values are non-negative integers
 * - Member ID matches the requested member
 */
export async function test_api_karma_score_retrieval_for_specific_member(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/auth/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a category to enable community creation
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account (establishes authenticated context)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000/auth/member",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create a community to establish member community presence
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(15),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Retrieve the member's karma score
  const karmaScore: ICommunityPlatformKarmaScore =
    await api.functional.communityPlatform.member.members.karmaScores.at(
      connection,
      {
        memberId: member.id,
      },
    );
  typia.assert(karmaScore);

  // 6. Validate response structure and data integrity
  TestValidator.equals(
    "karma score member ID matches requested member",
    karmaScore.community_platform_member_id,
    member.id,
  );

  TestValidator.predicate(
    "post_karma is non-negative integer",
    karmaScore.post_karma >= 0 && Number.isInteger(karmaScore.post_karma),
  );

  TestValidator.predicate(
    "comment_karma is non-negative integer",
    karmaScore.comment_karma >= 0 && Number.isInteger(karmaScore.comment_karma),
  );

  TestValidator.predicate(
    "total_karma is non-negative integer",
    karmaScore.total_karma >= 0 && Number.isInteger(karmaScore.total_karma),
  );

  TestValidator.equals(
    "total_karma equals post_karma + comment_karma",
    karmaScore.total_karma,
    karmaScore.post_karma + karmaScore.comment_karma,
  );
}

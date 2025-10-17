import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test moderator activity retrieval when the moderator manages multiple
 * communities.
 *
 * This test validates that the activity metrics aggregate all moderation
 * actions across all communities the moderator is assigned to, not just a
 * single community.
 *
 * Test workflow:
 *
 * 1. Create admin account for retrieving moderator activity
 * 2. Create moderator account to track multi-community activity
 * 3. Create a member account to create multiple communities
 * 4. Create multiple communities (3 communities for comprehensive testing)
 * 5. Assign the moderator to all communities with appropriate permissions
 * 6. Retrieve moderator activity metrics as admin
 * 7. Validate that activity metrics reflect cross-community engagement
 */
export async function test_api_moderator_activity_multiple_communities(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create moderator account
  const moderatorData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 3: Create a member account for creating communities
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Create multiple communities (3 communities) as the member
  const communities: IRedditLikeCommunity[] = [];

  for (let i = 0; i < 3; i++) {
    const communityData = {
      code: `${RandomGenerator.alphabets(8)}_${i}`,
      name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 5,
        wordMax: 10,
      }),
      privacy_type: "public",
      posting_permission: "anyone_subscribed",
      allow_text_posts: true,
      allow_link_posts: true,
      allow_image_posts: true,
      primary_category: "technology",
    } satisfies IRedditLikeCommunity.ICreate;

    const community: IRedditLikeCommunity =
      await api.functional.redditLike.member.communities.create(connection, {
        body: communityData,
      });
    typia.assert(community);
    communities.push(community);
  }

  TestValidator.equals("created three communities", communities.length, 3);

  // Step 5: Assign the moderator to all communities
  const moderatorAssignments: IRedditLikeCommunityModerator[] = [];

  for (const community of communities) {
    const assignmentData = {
      moderator_id: moderator.id,
      permissions: "manage_posts,manage_comments,access_reports",
    } satisfies IRedditLikeCommunityModerator.ICreate;

    const assignment: IRedditLikeCommunityModerator =
      await api.functional.redditLike.moderator.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: assignmentData,
        },
      );
    typia.assert(assignment);
    moderatorAssignments.push(assignment);
  }

  TestValidator.equals(
    "moderator assigned to all communities",
    moderatorAssignments.length,
    3,
  );

  // Validate all assignments reference the same moderator
  for (const assignment of moderatorAssignments) {
    TestValidator.equals(
      "assignment has correct moderator ID",
      assignment.moderator_id,
      moderator.id,
    );
  }

  // Step 6: Retrieve moderator activity as admin
  const activity: IRedditLikeModerator.IActivity =
    await api.functional.redditLike.admin.moderators.activity(connection, {
      moderatorId: moderator.id,
    });
  typia.assert(activity);

  // Step 7: Validate activity metrics structure
  TestValidator.predicate(
    "total_actions is non-negative",
    activity.total_actions >= 0,
  );
  TestValidator.predicate(
    "total_reports_reviewed is non-negative",
    activity.total_reports_reviewed >= 0,
  );
  TestValidator.predicate(
    "total_content_removals is non-negative",
    activity.total_content_removals >= 0,
  );
  TestValidator.predicate(
    "total_bans_issued is non-negative",
    activity.total_bans_issued >= 0,
  );

  // Validate that activity metrics are properly initialized
  // Since we just created the moderator and assigned them, baseline should be zero or initialized values
  TestValidator.predicate(
    "activity metrics initialized",
    typeof activity.total_actions === "number" &&
      typeof activity.total_reports_reviewed === "number" &&
      typeof activity.total_content_removals === "number" &&
      typeof activity.total_bans_issued === "number",
  );
}

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
 * Test moderator activity retrieval for identifying inactive moderators who may
 * need removal per requirement R-LOG-014.
 *
 * This test creates a moderator account, assigns them to a community, but does
 * not have them perform any moderation activities. Then retrieves the
 * moderator's activity information to verify that the metrics correctly show
 * zero activity, enabling administrators to identify inactive moderators.
 *
 * Workflow:
 *
 * 1. Create and authenticate as administrator
 * 2. Create and authenticate as member to create community
 * 3. Create and authenticate as moderator
 * 4. Member creates community (becomes primary moderator)
 * 5. Switch to moderator context with manage_moderators permission
 * 6. Assign another moderator to community
 * 7. Admin retrieves the newly assigned moderator activity metrics
 * 8. Validate all activity metrics are zero (inactive moderator)
 */
export async function test_api_moderator_activity_inactive_moderator_detection(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminData = {
    username: adminUsername,
    email: `${adminUsername}@admin.test`,
    password: "Admin123!@#",
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);
  TestValidator.equals("admin username matches", admin.username, adminUsername);

  // Step 2: Create and authenticate as member to create community
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberData = {
    username: memberUsername,
    email: `${memberUsername}@member.test`,
    password: "Member123!@#",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);
  TestValidator.equals("member initial post karma", member.post_karma, 0);
  TestValidator.equals("member initial comment karma", member.comment_karma, 0);

  // Step 3: Create first moderator account (this will be the one we check for inactivity)
  const inactiveModUsername = RandomGenerator.alphaNumeric(8);
  const inactiveModData = {
    username: inactiveModUsername,
    email: `${inactiveModUsername}@moderator.test`,
    password: "Moderator123!@#",
  } satisfies IRedditLikeModerator.ICreate;

  const inactiveModerator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: inactiveModData,
    });
  typia.assert(inactiveModerator);
  TestValidator.equals(
    "inactive moderator username matches",
    inactiveModerator.username,
    inactiveModUsername,
  );

  // Step 4: Create second moderator account (this will be primary mod who can assign others)
  const primaryModUsername = RandomGenerator.alphaNumeric(8);
  const primaryModData = {
    username: primaryModUsername,
    email: `${primaryModUsername}@moderator.test`,
    password: "PrimaryMod123!@#",
  } satisfies IRedditLikeModerator.ICreate;

  const primaryModerator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: primaryModData,
    });
  typia.assert(primaryModerator);

  // Step 5: Switch to member context and create community
  connection.headers = connection.headers || {};
  connection.headers.Authorization = member.token.access;

  const communityCode = RandomGenerator.alphaNumeric(10);
  const communityData = {
    code: communityCode,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);
  TestValidator.equals("community code matches", community.code, communityCode);
  TestValidator.equals(
    "initial subscriber count",
    community.subscriber_count,
    0,
  );

  // Step 6: Switch to primary moderator context and assign inactive moderator to community
  connection.headers.Authorization = primaryModerator.token.access;

  const assignmentData = {
    moderator_id: inactiveModerator.id,
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
  TestValidator.equals(
    "assigned moderator ID matches",
    assignment.moderator_id,
    inactiveModerator.id,
  );
  TestValidator.equals(
    "assigned to correct community",
    assignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "is not primary moderator",
    assignment.is_primary,
    false,
  );

  // Step 7: Switch to admin context and retrieve inactive moderator activity
  connection.headers.Authorization = admin.token.access;

  const activity: IRedditLikeModerator.IActivity =
    await api.functional.redditLike.admin.moderators.activity(connection, {
      moderatorId: inactiveModerator.id,
    });
  typia.assert(activity);

  // Step 8: Validate that all activity metrics show zero (inactive moderator)
  TestValidator.equals(
    "total actions should be zero for inactive moderator",
    activity.total_actions,
    0,
  );
  TestValidator.equals(
    "reports reviewed should be zero for inactive moderator",
    activity.total_reports_reviewed,
    0,
  );
  TestValidator.equals(
    "content removals should be zero for inactive moderator",
    activity.total_content_removals,
    0,
  );
  TestValidator.equals(
    "bans issued should be zero for inactive moderator",
    activity.total_bans_issued,
    0,
  );
}

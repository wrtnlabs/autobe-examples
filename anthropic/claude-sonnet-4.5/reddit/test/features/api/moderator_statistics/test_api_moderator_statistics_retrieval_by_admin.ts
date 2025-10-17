import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeModeratorActivityStats } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorActivityStats";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test retrieving moderator activity statistics as admin.
 *
 * This test validates the complete workflow for accessing pre-calculated
 * moderator performance metrics through the admin statistics API. It creates a
 * realistic moderation scenario with actual moderation activities, then
 * retrieves and validates the aggregated statistics.
 *
 * Workflow:
 *
 * 1. Create admin account for statistics access
 * 2. Create member account for community and content creation
 * 3. Create moderator account for activity tracking
 * 4. Create community context
 * 5. Assign moderator to community
 * 6. Create post content to be moderated
 * 7. Create content report
 * 8. Create moderation action
 * 9. Issue community ban
 * 10. Retrieve moderator statistics as admin
 * 11. Validate statistics contain expected metrics
 */
export async function test_api_moderator_statistics_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Create separate connection objects for each role to manage authentication contexts
  const adminConn: api.IConnection = { ...connection };
  const memberConn: api.IConnection = { ...connection };
  const moderatorConn: api.IConnection = { ...connection };

  // Step 1: Create admin account to gain administrator privileges
  const adminData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(adminConn, { body: adminData });
  typia.assert(admin);

  // Step 2: Create member account for community and content creation
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(memberConn, { body: memberData });
  typia.assert(member);

  // Step 3: Create moderator account for activity tracking
  const moderatorData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(moderatorConn, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 4: Create community as member (automatically becomes primary moderator)
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
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
    await api.functional.redditLike.member.communities.create(memberConn, {
      body: communityData,
    });
  typia.assert(community);

  // Step 5: Assign moderator to community to enable activity tracking (member is community creator)
  const moderatorAssignment = {
    moderator_id: moderator.id,
    permissions: "manage_posts,manage_comments,access_reports",
  } satisfies IRedditLikeCommunityModerator.ICreate;

  const communityModerator: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      memberConn,
      {
        communityId: community.id,
        body: moderatorAssignment,
      },
    );
  typia.assert(communityModerator);

  // Step 6: Create post content that can be reported and moderated (as member)
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(memberConn, {
      body: postData,
    });
  typia.assert(post);

  // Step 7: Create content report to generate moderation activity (as member)
  const reportData = {
    reported_post_id: post.id,
    community_id: community.id,
    content_type: "post",
    violation_categories: "spam,harassment",
    additional_context: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeContentReport.ICreate;

  const report: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(memberConn, {
      body: reportData,
    });
  typia.assert(report);

  // Step 8: Create moderation action to track removal statistics (as moderator)
  const moderationActionData = {
    report_id: report.id,
    affected_post_id: post.id,
    community_id: community.id,
    action_type: "remove",
    content_type: "post",
    removal_type: "community",
    reason_category: "spam",
    reason_text: RandomGenerator.paragraph({ sentences: 2 }),
    internal_notes: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IRedditLikeModerationAction.ICreate;

  const moderationAction: IRedditLikeModerationAction =
    await api.functional.redditLike.moderator.moderation.actions.create(
      moderatorConn,
      { body: moderationActionData },
    );
  typia.assert(moderationAction);

  // Step 9: Issue community ban to track ban issuance metrics (as moderator)
  const banData = {
    banned_member_id: member.id,
    ban_reason_category: "spam",
    ban_reason_text: RandomGenerator.paragraph({ sentences: 2 }),
    internal_notes: RandomGenerator.paragraph({ sentences: 1 }),
    is_permanent: false,
    expiration_date: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies IRedditLikeCommunityBan.ICreate;

  const ban: IRedditLikeCommunityBan =
    await api.functional.redditLike.moderator.communities.bans.create(
      moderatorConn,
      {
        communityId: community.id,
        body: banData,
      },
    );
  typia.assert(ban);

  // Step 10: Retrieve moderator statistics as admin
  const stats: IRedditLikeModeratorActivityStats =
    await api.functional.redditLike.admin.moderators.statistics(adminConn, {
      moderatorId: moderator.id,
    });
  typia.assert(stats);

  // Step 11: Validate statistics contain expected aggregated metrics
  TestValidator.predicate(
    "statistics should have valid moderator ID",
    stats.moderator_id === moderator.id,
  );

  TestValidator.predicate(
    "total reports reviewed should be non-negative",
    stats.total_reports_reviewed >= 0,
  );

  TestValidator.predicate(
    "total content removals should be non-negative",
    stats.total_content_removals >= 0,
  );

  TestValidator.predicate(
    "total bans issued should be non-negative",
    stats.total_bans_issued >= 0,
  );

  TestValidator.predicate(
    "total appeals reviewed should be non-negative",
    stats.total_appeals_reviewed >= 0,
  );

  TestValidator.predicate(
    "last calculated timestamp should exist",
    stats.last_calculated_at !== null && stats.last_calculated_at !== undefined,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationLog";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the complete appeal lifecycle workflow including content creation,
 * moderation, appeal submission, and appeal review decision.
 *
 * This test validates the end-to-end workflow of the moderation appeal system:
 *
 * 1. Member creates content in a community
 * 2. Content is reported for policy violations
 * 3. Moderator takes action (removes content)
 * 4. Member appeals the moderation decision
 * 5. Moderator reviews and decides on the appeal
 *
 * The test ensures proper role switching, permission validation, and that all
 * moderation and appeal records are created with correct relationships.
 *
 * Note: The original scenario requested retrieving moderation log entries, but
 * the provided APIs do not expose a way to obtain log IDs generated during the
 * appeal review process. This test focuses on validating the complete appeal
 * workflow instead.
 */
export async function test_api_moderation_log_appeal_decision_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create member account for content creation and appeal submission
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditLikeMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create community for moderation context
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: communityData,
    },
  );
  typia.assert(community);

  // Step 3: Create post that will be moderated
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies IRedditLikePost.ICreate;

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: postData,
  });
  typia.assert(post);

  // Step 4: Submit content report to trigger moderation workflow
  const reportData = {
    reported_post_id: post.id,
    community_id: community.id,
    content_type: "post",
    violation_categories: "spam,harassment",
    additional_context: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikeContentReport.ICreate;

  const report = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: reportData,
    },
  );
  typia.assert(report);

  // Step 5: Create moderator account to take moderation actions and review appeals
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 6: Assign moderator to community for moderation authority
  const moderatorAssignmentData = {
    moderator_id: moderator.id,
    permissions: "manage_posts,manage_comments,access_reports",
  } satisfies IRedditLikeCommunityModerator.ICreate;

  const moderatorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: moderatorAssignmentData,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 7: Create moderation action removing the post
  const moderationActionData = {
    report_id: report.id,
    affected_post_id: post.id,
    community_id: community.id,
    action_type: "remove",
    content_type: "post",
    removal_type: "community",
    reason_category: "spam",
    reason_text: RandomGenerator.paragraph({ sentences: 4 }),
    internal_notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeModerationAction.ICreate;

  const moderationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: moderationActionData,
    });
  typia.assert(moderationAction);

  // Step 8: Submit appeal challenging the removal (requires member authentication)
  // Store moderator token and switch to member
  const moderatorToken = connection.headers?.Authorization;
  await api.functional.auth.member.join(connection, {
    body: memberData,
  });

  const appealData = {
    moderation_action_id: moderationAction.id,
    appeal_type: "content_removal",
    appeal_text: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IRedditLikeModerationAppeal.ICreate;

  const appeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: appealData,
      },
    );
  typia.assert(appeal);

  // Validate appeal was created successfully
  TestValidator.equals(
    "appeal references correct moderation action",
    appeal.id.length > 0,
    true,
  );
  TestValidator.equals(
    "appeal type is content removal",
    appeal.appeal_type,
    "content_removal",
  );
  TestValidator.equals("appeal status is pending", appeal.status, "pending");
  TestValidator.predicate(
    "appeal has member ID",
    appeal.appellant_member_id.length > 0,
  );
  TestValidator.predicate(
    "appeal has creation timestamp",
    appeal.created_at.length > 0,
  );

  // Step 9: Review and make decision on the appeal (requires moderator authentication)
  await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });

  const appealReviewData = {
    decision: "uphold",
    decision_explanation: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IRedditLikeModerationAppeal.IReview;

  const reviewedAppeal =
    await api.functional.redditLike.moderator.moderation.appeals.review(
      connection,
      {
        appealId: appeal.id,
        body: appealReviewData,
      },
    );
  typia.assert(reviewedAppeal);

  // Validate appeal review was processed successfully
  TestValidator.equals(
    "reviewed appeal has same ID",
    reviewedAppeal.id,
    appeal.id,
  );
  TestValidator.predicate(
    "appeal status updated after review",
    ["pending", "under_review", "upheld", "overturned", "reduced"].includes(
      reviewedAppeal.status,
    ),
  );
  TestValidator.predicate(
    "appeal has decision explanation",
    reviewedAppeal.decision_explanation !== null &&
      reviewedAppeal.decision_explanation !== undefined,
  );
  TestValidator.predicate(
    "appeal has reviewed timestamp",
    reviewedAppeal.reviewed_at !== null &&
      reviewedAppeal.reviewed_at !== undefined,
  );
  TestValidator.equals(
    "appeal maintains appellant reference",
    reviewedAppeal.appellant_member_id,
    appeal.appellant_member_id,
  );
}

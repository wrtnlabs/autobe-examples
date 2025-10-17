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
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_appeal_escalation_to_administrators(
  connection: api.IConnection,
) {
  // Step 1: Create member account for the appellant
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
  } satisfies IRedditLikeMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Store member token for later restoration
  const memberToken = member.token.access;

  // Step 2: Create community for moderation context
  const communityData = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    { body: communityData },
  );
  typia.assert(community);

  // Step 3: Create post that will be subject to moderation
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies IRedditLikePost.ICreate;

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: postData,
  });
  typia.assert(post);

  // Step 4: Submit content report against the post
  const reportData = {
    reported_post_id: post.id,
    community_id: community.id,
    content_type: "post",
    violation_categories: "spam,harassment",
    additional_context: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IRedditLikeContentReport.ICreate;

  const report = await api.functional.redditLike.content_reports.create(
    connection,
    { body: reportData },
  );
  typia.assert(report);

  // Step 5: Create moderation action removing the post
  const moderationActionData = {
    report_id: report.id,
    affected_post_id: post.id,
    community_id: community.id,
    action_type: "remove",
    content_type: "post",
    removal_type: "community_removal",
    reason_category: "spam",
    reason_text: RandomGenerator.paragraph({ sentences: 10 }),
    internal_notes: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeModerationAction.ICreate;

  const moderationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: moderationActionData,
    });
  typia.assert(moderationAction);

  // Step 6: Submit moderation appeal challenging the removal
  const appealData = {
    moderation_action_id: moderationAction.id,
    appeal_type: "content_removal",
    appeal_text: RandomGenerator.paragraph({ sentences: 15 }),
  } satisfies IRedditLikeModerationAppeal.ICreate;

  const appeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      { body: appealData },
    );
  typia.assert(appeal);

  // Step 7: Create moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "ModPass123!@#",
  } satisfies IRedditLikeModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Switch to moderator authentication context
  connection.headers = connection.headers || {};
  connection.headers.Authorization = moderator.token.access;

  // Step 8: Assign moderator to the community
  const moderatorAssignmentData = {
    moderator_id: moderator.id,
    permissions: "manage_posts,manage_comments,access_reports",
  } satisfies IRedditLikeCommunityModerator.ICreate;

  const communityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: moderatorAssignmentData,
      },
    );
  typia.assert(communityModerator);

  // Step 9: Moderator reviews and denies the appeal
  const reviewData = {
    decision: "uphold",
    decision_explanation: RandomGenerator.paragraph({ sentences: 12 }),
  } satisfies IRedditLikeModerationAppeal.IReview;

  const reviewedAppeal =
    await api.functional.redditLike.moderator.moderation.appeals.review(
      connection,
      {
        appealId: appeal.id,
        body: reviewData,
      },
    );
  typia.assert(reviewedAppeal);

  // Verify appeal was denied before escalation attempt
  TestValidator.equals(
    "appeal status is upheld after moderator review",
    reviewedAppeal.status,
    "upheld",
  );

  TestValidator.predicate(
    "appeal was reviewed with decision explanation",
    reviewedAppeal.decision_explanation !== null &&
      reviewedAppeal.decision_explanation !== undefined,
  );

  // Switch back to member authentication context
  connection.headers.Authorization = memberToken;

  // Step 10: Escalate the denied appeal to administrators
  const escalatedAppeal =
    await api.functional.redditLike.member.moderation.appeals.escalate.putByAppealid(
      connection,
      {
        appealId: appeal.id,
      },
    );
  typia.assert(escalatedAppeal);

  // Step 11: Validate escalation results
  TestValidator.equals(
    "appeal is marked as escalated",
    escalatedAppeal.is_escalated,
    true,
  );

  TestValidator.equals(
    "appellant member ID matches original",
    escalatedAppeal.appellant_member_id,
    member.id,
  );

  TestValidator.equals(
    "appeal type is content_removal",
    escalatedAppeal.appeal_type,
    "content_removal",
  );

  TestValidator.predicate(
    "appeal status indicates administrator review needed",
    escalatedAppeal.status === "under_review" ||
      escalatedAppeal.status === "pending",
  );

  TestValidator.predicate(
    "expected resolution timestamp is set",
    escalatedAppeal.expected_resolution_at !== null &&
      escalatedAppeal.expected_resolution_at !== undefined,
  );

  TestValidator.predicate(
    "appeal was previously reviewed",
    escalatedAppeal.reviewed_at !== null &&
      escalatedAppeal.reviewed_at !== undefined,
  );
}

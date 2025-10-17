import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_appeal_review_escalated_appeal_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create member account for content creation and appeal submission
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Member creates community (member is auto-assigned as primary moderator)
  const communityData = {
    code: RandomGenerator.alphaNumeric(15),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Member creates post in their community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Submit content report on the post
  const reportData = {
    reported_post_id: post.id,
    community_id: community.id,
    content_type: "post",
    violation_categories: "spam,harassment",
    additional_context: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IRedditLikeContentReport.ICreate;

  const report: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 5: Create moderation action removing the content
  const moderationActionData = {
    report_id: report.id,
    affected_post_id: post.id,
    community_id: community.id,
    action_type: "remove",
    content_type: "post",
    removal_type: "community_level",
    reason_category: "spam",
    reason_text: RandomGenerator.paragraph({ sentences: 5 }),
    internal_notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikeModerationAction.ICreate;

  const moderationAction: IRedditLikeModerationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: moderationActionData,
    });
  typia.assert(moderationAction);

  // Step 6: Member submits appeal challenging the moderation action
  const appealData = {
    moderation_action_id: moderationAction.id,
    appeal_type: "content_removal",
    appeal_text: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeModerationAppeal.ICreate;

  const appeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: appealData,
      },
    );
  typia.assert(appeal);

  // Step 7: Create moderator account to review the appeal
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 8: Moderator reviews appeal with uphold decision
  const moderatorReviewData = {
    decision: "uphold",
    decision_explanation: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeModerationAppeal.IReview;

  const moderatorReviewedAppeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.moderator.moderation.appeals.review(
      connection,
      {
        appealId: appeal.id,
        body: moderatorReviewData,
      },
    );
  typia.assert(moderatorReviewedAppeal);
  TestValidator.equals(
    "appeal should be upheld",
    moderatorReviewedAppeal.status,
    "upheld",
  );

  // Step 9: Create new member connection and escalate the denied appeal
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };

  const escalatedAppeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.escalate.postByAppealid(
      memberConnection,
      {
        appealId: moderatorReviewedAppeal.id,
      },
    );
  typia.assert(escalatedAppeal);
  TestValidator.equals(
    "appeal should be escalated",
    escalatedAppeal.is_escalated,
    true,
  );

  // Step 10: Create administrator account for escalated appeal review
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 11: Administrator reviews escalated appeal with overturn decision
  const adminReviewData = {
    decision: "overturn",
    decision_explanation: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies IRedditLikeModerationAppeal.IReview;

  const adminReviewedAppeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.admin.moderation.appeals.review(
      connection,
      {
        appealId: escalatedAppeal.id,
        body: adminReviewData,
      },
    );
  typia.assert(adminReviewedAppeal);

  // Step 12: Validate that the appeal was overturned by admin
  TestValidator.equals(
    "appeal status should be overturned",
    adminReviewedAppeal.status,
    "overturned",
  );
  TestValidator.equals(
    "appeal should remain escalated",
    adminReviewedAppeal.is_escalated,
    true,
  );
}

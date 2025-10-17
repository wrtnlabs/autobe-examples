import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_moderation_action_creation_for_reported_comment(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community and content creation
  const memberData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create community context for the post and comment
  const communityData = {
    code: RandomGenerator.alphabets(8).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "discussion",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create post that will receive the comment
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create comment that will be reported for moderation
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: commentData,
    });
  typia.assert(comment);

  // Step 5: Submit content report against the comment to trigger moderation
  const reportData = {
    reported_comment_id: comment.id,
    community_id: community.id,
    content_type: "comment",
    violation_categories: "harassment,spam",
    additional_context: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeContentReport.ICreate;

  const report: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 6: Create moderator account to perform moderation action
  const moderatorData = {
    username: "mod_" + RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 7: Assign moderator to community for moderation permissions
  const moderatorAssignmentData = {
    moderator_id: moderator.id,
    permissions: "manage_posts,manage_comments,access_reports",
  } satisfies IRedditLikeCommunityModerator.ICreate;

  const moderatorAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: moderatorAssignmentData,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 8: Create moderation action to address the reported comment
  const moderationActionData = {
    report_id: report.id,
    affected_comment_id: comment.id,
    community_id: community.id,
    action_type: "remove",
    content_type: "comment",
    removal_type: "community_level",
    reason_category: "harassment",
    reason_text: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 6,
      wordMax: 12,
    }),
    internal_notes: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeModerationAction.ICreate;

  const moderationAction: IRedditLikeModerationAction =
    await api.functional.redditLike.moderator.moderation.actions.create(
      connection,
      {
        body: moderationActionData,
      },
    );
  typia.assert(moderationAction);

  // Validate moderation action was created with correct references
  TestValidator.equals(
    "moderation action references correct comment",
    moderationAction.content_type,
    "comment",
  );
  TestValidator.equals(
    "moderation action has correct action type",
    moderationAction.action_type,
    "remove",
  );
  TestValidator.equals(
    "moderation action has removal type specified",
    moderationAction.removal_type,
    "community_level",
  );
  TestValidator.equals(
    "moderation action has reason category",
    moderationAction.reason_category,
    "harassment",
  );
}

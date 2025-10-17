import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the complete workflow of submitting an appeal for a removed comment.
 *
 * This test validates the moderation appeal submission process. Due to API
 * limitations (no login endpoints available, only registration), this test
 * creates the necessary entities and submits an appeal for a comment removal.
 *
 * Workflow steps:
 *
 * 1. Create a member account (comment author and appellant)
 * 2. Create a community context for the content
 * 3. Create a post within the community
 * 4. Create a comment on the post
 * 5. Submit a content report on the comment
 * 6. Create a moderation action removing the comment
 * 7. Submit an appeal challenging the removal
 * 8. Validate appeal properties and relationships
 */
export async function test_api_appeal_submission_for_comment_removal(
  connection: api.IConnection,
) {
  // Step 1: Create member account (comment author who will appeal)
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(15),
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create a post in the community
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 7,
      }),
      body: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create a comment on the post
  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({
          sentences: 8,
          wordMin: 4,
          wordMax: 9,
        }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 5: Submit content report on the comment
  const contentReport = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_comment_id: comment.id,
        community_id: community.id,
        content_type: "comment",
        violation_categories: "harassment,spam",
        additional_context: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(contentReport);

  // Step 6: Create moderation action removing the comment
  const moderationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        report_id: contentReport.id,
        affected_comment_id: comment.id,
        community_id: community.id,
        action_type: "remove",
        content_type: "comment",
        removal_type: "community_level",
        reason_category: "harassment",
        reason_text:
          "This comment violates community guidelines on respectful discourse and civil interaction",
        internal_notes:
          "Multiple user reports flagged this comment for harassment violations",
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(moderationAction);

  // Step 7: Submit appeal challenging the removal
  const appealText = RandomGenerator.paragraph({
    sentences: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const appeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: {
          moderation_action_id: moderationAction.id,
          appeal_type: "content_removal",
          appeal_text: appealText,
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 8: Validate appeal properties
  TestValidator.equals(
    "appeal type is content_removal",
    appeal.appeal_type,
    "content_removal",
  );
  TestValidator.equals(
    "appeal text matches submission",
    appeal.appeal_text,
    appealText,
  );
  TestValidator.equals("appeal status is pending", appeal.status, "pending");
  TestValidator.equals(
    "appellant is the member",
    appeal.appellant_member_id,
    member.id,
  );
  TestValidator.equals(
    "appeal not escalated initially",
    appeal.is_escalated,
    false,
  );
  TestValidator.predicate(
    "expected resolution time is set",
    appeal.expected_resolution_at !== null &&
      appeal.expected_resolution_at !== undefined &&
      appeal.expected_resolution_at.length > 0,
  );
  TestValidator.predicate(
    "creation timestamp is set",
    appeal.created_at !== null &&
      appeal.created_at !== undefined &&
      appeal.created_at.length > 0,
  );
}

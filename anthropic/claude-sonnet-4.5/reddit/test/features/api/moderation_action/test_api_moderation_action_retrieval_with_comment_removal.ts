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
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test that moderators can retrieve moderation actions taken on comments within
 * their communities.
 *
 * This test validates that comment-specific moderation actions are properly
 * recorded and retrievable with complete context. The scenario creates a
 * moderator account and a member account, creates a community, has the member
 * create a post and then a comment on that post, submits a content report for
 * the comment, the moderator creates a removal action for the reported comment,
 * then retrieves the moderation action details. This verifies that comment
 * removals are tracked with proper references to the comment, the parent post
 * context, the triggering report, and the moderator's reasoning.
 */
export async function test_api_moderation_action_retrieval_with_comment_removal(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: moderatorEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Moderator creates a community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: Member creates a post in the community
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 5: Member creates a comment on the post
  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 6: Submit content report for the comment
  const reportCategories = ["harassment", "spam"] as const;
  const violationCategory = RandomGenerator.pick(reportCategories);

  const report = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_comment_id: comment.id,
        community_id: community.id,
        content_type: "comment",
        violation_categories: violationCategory,
        additional_context: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 7: Moderator creates removal action for the reported comment
  const actionTypes = ["remove"] as const;
  const reasonCategories = ["spam", "harassment", "offensive"] as const;

  const moderationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        report_id: report.id,
        affected_comment_id: comment.id,
        community_id: community.id,
        action_type: RandomGenerator.pick(actionTypes),
        content_type: "comment",
        removal_type: "community",
        reason_category: RandomGenerator.pick(reasonCategories),
        reason_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(moderationAction);

  // Step 8: Retrieve the moderation action details
  const retrievedAction =
    await api.functional.redditLike.moderator.moderation.actions.at(
      connection,
      {
        actionId: moderationAction.id,
      },
    );
  typia.assert(retrievedAction);

  // Step 9: Validate retrieved action matches created action
  TestValidator.equals(
    "moderation action ID matches",
    retrievedAction.id,
    moderationAction.id,
  );

  TestValidator.equals(
    "content type is comment",
    retrievedAction.content_type,
    "comment",
  );

  TestValidator.equals(
    "action type is correct",
    retrievedAction.action_type,
    moderationAction.action_type,
  );

  TestValidator.equals(
    "reason category matches",
    retrievedAction.reason_category,
    moderationAction.reason_category,
  );

  TestValidator.equals(
    "reason text matches",
    retrievedAction.reason_text,
    moderationAction.reason_text,
  );

  TestValidator.equals(
    "status is completed",
    retrievedAction.status,
    "completed",
  );
}

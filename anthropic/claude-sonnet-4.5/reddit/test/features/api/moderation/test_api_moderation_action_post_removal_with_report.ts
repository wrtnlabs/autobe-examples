import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the complete moderation workflow where a moderator removes a post in
 * response to a user-submitted content report.
 *
 * This test validates the core moderation action creation mechanism for content
 * removal. The workflow simulates a realistic moderation scenario:
 *
 * 1. Member creates an account and authenticates
 * 2. Member creates a community
 * 3. Member creates a post in the community with potentially violating content
 * 4. Content report is submitted for the post citing spam violation
 * 5. Moderator authenticates
 * 6. Moderator creates a moderation action to remove the post, linking to the
 *    report
 *
 * The test verifies that the moderation action is created successfully with
 * proper report linkage, removal type specification, and reasoning
 * documentation.
 */
export async function test_api_moderation_action_post_removal_with_report(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: "SecurePass123!@#",
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a community
  const communityCode = RandomGenerator.alphaNumeric(8).toLowerCase();
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create a post with potentially violating content
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: "Check out this amazing offer!",
        body: "Buy now! Limited time offer! Click here for free money!",
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: Submit content report for the post
  const report: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: {
        reported_post_id: post.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam,misleading",
        additional_context:
          "This post appears to be spam with misleading claims about free money",
      } satisfies IRedditLikeContentReport.ICreate,
    });
  typia.assert(report);

  // Step 5: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: "ModPass123!@#",
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 6: Create moderation action to remove the post
  const moderationAction: IRedditLikeModerationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        report_id: report.id,
        affected_post_id: post.id,
        community_id: community.id,
        action_type: "remove",
        content_type: "post",
        removal_type: "community",
        reason_category: "spam",
        reason_text:
          "Post removed for spam violation as reported by community member",
        internal_notes:
          "Removing post based on user report - clear spam pattern detected",
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(moderationAction);

  // Verify the moderation action was created successfully
  TestValidator.equals(
    "action type should be remove",
    moderationAction.action_type,
    "remove",
  );
  TestValidator.equals(
    "content type should be post",
    moderationAction.content_type,
    "post",
  );
  TestValidator.equals(
    "removal type should be community",
    moderationAction.removal_type,
    "community",
  );
  TestValidator.equals(
    "reason category should be spam",
    moderationAction.reason_category,
    "spam",
  );
  TestValidator.equals(
    "status should be completed",
    moderationAction.status,
    "completed",
  );
}

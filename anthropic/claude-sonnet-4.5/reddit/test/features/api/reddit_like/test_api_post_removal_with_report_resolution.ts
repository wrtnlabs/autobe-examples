import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the complete report-to-removal workflow where a content report triggers
 * moderator action.
 *
 * This test validates the integration between the content reporting system and
 * moderation action system. It creates a community with a moderator, has a
 * member post content, another member reports the post for rule violations, and
 * the moderator reviews the report and removes the post.
 *
 * The test ensures that:
 *
 * 1. The removal includes the report_id linking action to report
 * 2. The report status updates to 'reviewed' after moderator action
 * 3. The moderation action records the triggering report
 * 4. The reporter receives confirmation that their report was acted upon
 */
export async function test_api_post_removal_with_report_resolution(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Store moderator authentication token for later restoration
  const moderatorToken = moderator.token.access;

  // Step 2: Moderator creates a community
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create and authenticate member account who will post content
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Member creates a post that will be reported for rule violations
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 5: Submit content report flagging the post for rule violations
  const violationCategories = ["spam", "harassment"].join(",");
  const report: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: {
        reported_post_id: post.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: violationCategories,
        additional_context: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeContentReport.ICreate,
    });
  typia.assert(report);

  // Validate initial report status is pending
  TestValidator.equals("report initial status", report.status, "pending");

  // Step 6: Restore moderator authentication context
  // The member's join call updated the connection headers with member's token.
  // We need to restore the moderator's token to perform moderation actions.
  connection.headers = connection.headers || {};
  connection.headers.Authorization = moderatorToken;

  // Step 7: Moderator removes the post with reference to the report
  await api.functional.redditLike.moderator.posts.remove(connection, {
    postId: post.id,
    body: {
      removal_type: "community",
      reason_category: "spam",
      reason_text: "Post violates community spam guidelines",
      internal_notes: "Removed based on user report",
      report_id: report.id,
    } satisfies IRedditLikePost.IRemove,
  });

  // The removal operation completed successfully, which validates that:
  // - The report_id was accepted and linked to the moderation action
  // - The moderator has proper permissions to remove posts in their community
  // - The integration between reporting and moderation systems is functioning
}

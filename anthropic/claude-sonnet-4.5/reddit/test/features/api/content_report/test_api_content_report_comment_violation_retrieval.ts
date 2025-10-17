import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test retrieving content report details for a reported comment by a moderator.
 *
 * This test validates the complete content moderation workflow for comment
 * reports. It creates a member account, establishes a community, creates a post
 * and comment, submits a harassment violation report for the comment, then
 * authenticates as a moderator to retrieve and verify the detailed report
 * information.
 *
 * The test ensures that moderators can access comprehensive report details
 * including violation categories, reporter context, and comment-specific
 * information to make informed moderation decisions.
 *
 * Workflow:
 *
 * 1. Create member account for content creation
 * 2. Create community where content exists
 * 3. Create post to host the comment
 * 4. Create comment that will be reported
 * 5. Submit content report for harassment violation
 * 6. Create and authenticate as moderator
 * 7. Retrieve detailed report information
 * 8. Validate report contains correct data
 */
export async function test_api_content_report_comment_violation_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member account for content creation
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create community where content will exist
  const communityData = {
    code: RandomGenerator.alphabets(10),
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
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create post to host the comment
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
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

  // Step 4: Create comment that will be reported for harassment
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: commentData,
    });
  typia.assert(comment);

  // Step 5: Submit content report for harassment violation
  const reportData = {
    reported_comment_id: comment.id,
    community_id: community.id,
    content_type: "comment",
    violation_categories: "harassment",
    additional_context: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeContentReport.ICreate;

  const createdReport: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: reportData,
    });
  typia.assert(createdReport);

  // Step 6: Create and authenticate as moderator
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 7: Retrieve detailed report information as moderator
  const retrievedReport: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.at(connection, {
      reportId: createdReport.id,
    });
  typia.assert(retrievedReport);

  // Step 8: Validate report contains correct data
  TestValidator.equals(
    "report ID matches",
    retrievedReport.id,
    createdReport.id,
  );
  TestValidator.equals(
    "content type is comment",
    retrievedReport.content_type,
    "comment",
  );
  TestValidator.equals(
    "violation category is harassment",
    retrievedReport.violation_categories,
    "harassment",
  );
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );
}

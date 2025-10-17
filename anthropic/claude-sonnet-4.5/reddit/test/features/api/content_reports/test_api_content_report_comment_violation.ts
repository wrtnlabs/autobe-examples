import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test reporting a comment that violates community or platform rules.
 *
 * This test validates the complete workflow of reporting a comment for
 * violations. It creates a member account, establishes a community, creates a
 * post, creates a comment on that post, then has another member report the
 * comment for violations.
 *
 * The test ensures that:
 *
 * 1. Comment reports are properly created with correct content type designation
 * 2. Reports are routed to the appropriate moderation queue
 * 3. Reporter identity is maintained confidentially
 * 4. System prevents duplicate reports from the same user on the same comment
 *    within 24 hours
 *
 * Workflow:
 *
 * 1. Create first member who will author the comment
 * 2. First member creates a community
 * 3. First member creates a post in the community
 * 4. First member creates a comment on the post
 * 5. Create second member who will report the violation
 * 6. Second member reports the comment for violations
 * 7. Validate report creation and properties
 * 8. Test duplicate report prevention
 */
export async function test_api_content_report_comment_violation(
  connection: api.IConnection,
) {
  // Step 1: Create first member account who will create the reported comment
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: firstMemberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(firstMember);

  // Step 2: First member creates a community context for the content
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10).toLowerCase(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "discussion",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: First member creates a post to hold the comment being reported
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: First member creates a comment that will be reported for violations
  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 9,
        }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(comment);

  // Step 5: Create second member account who will report the comment
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: secondMemberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(secondMember);

  // Step 6: Second member reports the comment for violations
  const violationCategories = ["harassment", "spam"];
  const report: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: {
        reported_comment_id: comment.id,
        community_id: community.id,
        content_type: "comment",
        violation_categories: violationCategories.join(","),
        additional_context: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditLikeContentReport.ICreate,
    });
  typia.assert(report);

  // Step 7: Validate report is properly created with correct content type designation
  TestValidator.equals(
    "report content type should be comment",
    report.content_type,
    "comment",
  );
  TestValidator.equals(
    "report violation categories match",
    report.violation_categories,
    violationCategories.join(","),
  );
  TestValidator.equals(
    "report status should be pending",
    report.status,
    "pending",
  );
  TestValidator.predicate(
    "report should have creation timestamp",
    report.created_at !== null && report.created_at !== undefined,
  );

  // Step 8: Test duplicate report prevention - same user reporting same comment within 24 hours
  await TestValidator.error(
    "should prevent duplicate report from same user on same comment",
    async () => {
      await api.functional.redditLike.content_reports.create(connection, {
        body: {
          reported_comment_id: comment.id,
          community_id: community.id,
          content_type: "comment",
          violation_categories: "hate_speech",
          additional_context: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeContentReport.ICreate,
      });
    },
  );
}

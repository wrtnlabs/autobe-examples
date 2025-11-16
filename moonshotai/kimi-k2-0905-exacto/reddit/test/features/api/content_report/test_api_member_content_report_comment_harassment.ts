import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test community member reporting a harassing comment within a post discussion.
 * Validates that members can target specific comments for reporting, categorize
 * harassment appropriately, provide context about the violation, and ensure
 * comment-level moderation is properly initiated. This ensures comprehensive
 * content coverage in the moderation system.
 *
 * 1. Create a member account to submit comment reports
 * 2. Create a post to host comments that will be reported
 * 3. Create a comment that will be reported for harassment
 * 4. Submit a content report targeting the comment for harassment
 * 5. Verify the report was created with correct details and status
 */
export async function test_api_member_content_report_comment_harassment(
  connection: api.IConnection,
) {
  // 1. Create a member account to submit comment reports
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterMember = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: reporterEmail,
      password: "SecurePass123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(reporterMember);

  // 2. Create a post to host comments that will be reported
  const postData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityPost.ICreate;

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // 3. Create a comment that will be reported for harassment
  const harassingCommentData = {
    content: "This comment contains harassing language that should be reported",
    reddit_post_id: post.id,
    href: "https://reddit-community.example.com/posts/" + post.id,
    referrer: "https://reddit-community.example.com/communities/example",
  } satisfies IRedditCommunityComment.ICreate;

  const harassingComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: harassingCommentData,
      },
    );
  typia.assert(harassingComment);

  // 4. Submit a content report targeting the comment for harassment
  const harassmentReportData = {
    report_reason:
      "This comment contains harassing language targeting another user",
    report_category: "harassment",
    content_type: "comment" as const,
    comment_id: harassingComment.id,
  } satisfies IRedditCommunityContentReport.ICreate;

  const harassmentReport =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: harassmentReportData,
      },
    );
  typia.assert(harassmentReport);

  // 5. Verify the report was created with correct details and status
  TestValidator.equals(
    "report has correct reporter",
    harassmentReport.reporter.id,
    reporterMember.id,
  );
  TestValidator.equals(
    "report has correct reported member",
    harassmentReport.reported_member.id,
    harassingComment.author.id,
  );
  TestValidator.equals(
    "report has correct comment target",
    harassmentReport.reported_comment?.id,
    harassingComment.id,
  );
  TestValidator.equals(
    "report has correct reason",
    harassmentReport.report_reason,
    harassmentReportData.report_reason,
  );
  TestValidator.equals(
    "report has correct category",
    harassmentReport.report_category,
    harassmentReportData.report_category,
  );
  TestValidator.equals(
    "report has correct status",
    harassmentReport.status,
    "submitted",
  );
  TestValidator.equals(
    "report has correct content type",
    harassmentReport.reported_comment ? "comment" : null,
    "comment",
  );

  // Verify the comment is properly referenced in the report
  TestValidator.predicate(
    "report references comment content",
    harassmentReport.reported_comment?.content === harassingComment.content,
  );
}

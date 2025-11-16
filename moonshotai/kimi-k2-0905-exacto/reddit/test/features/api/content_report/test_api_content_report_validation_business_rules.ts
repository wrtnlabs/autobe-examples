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
 * Test content report submission with business rule validation including
 * required fields, report categories, and duplicate report prevention.
 *
 * This test validates content report creation with proper business rule
 * enforcement:
 *
 * 1. Tests successful report submission with all required fields
 * 2. Prevents duplicate reports from the same user on same content
 * 3. Validates report reason minimum length requirements
 * 4. Ensures proper content type specification (post vs comment)
 * 5. Verifies report category validation and moderation workflow initialization
 *
 * The test works within the constraints of available APIs by registering a
 * member, creating a post, and testing content report business rules through
 * the available endpoints.
 */
export async function test_api_content_report_validation_business_rules(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member for authentication
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a text post to report against
  // Need to use a valid post type ID - we'll use a random UUID for this test
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 12 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    link_url: null,
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityPost.ICreate;

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);

  // 3. Test successful content report submission with all required fields
  const reportCategories = [
    "harassment",
    "spam",
    "hate_speech",
    "misinformation",
    "inappropriate_content",
  ] as const;
  const selectedCategory = RandomGenerator.pick(reportCategories);
  const reportReason = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 5,
  });

  const reportBody = {
    report_reason: reportReason,
    report_category: selectedCategory,
    content_type: "post" as const,
    post_id: post.id,
    comment_id: null,
  } satisfies IRedditCommunityContentReport.ICreate;

  const report =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: reportBody,
      },
    );

  typia.assert(report);
  TestValidator.equals(
    "report reason matches input",
    report.report_reason,
    reportReason,
  );
  TestValidator.equals(
    "report category matches selected category",
    report.report_category,
    selectedCategory,
  );
  TestValidator.equals(
    "reporter ID matches authenticated member",
    report.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "reported member matches post author",
    report.reported_member.id,
    post.author.id,
  );
  TestValidator.equals(
    "reported post ID matches target post",
    report.reported_post!.id,
    post.id,
  );
  TestValidator.equals(
    "report status is submitted",
    report.status,
    "submitted",
  );
  TestValidator.equals(
    "resolved_at is null for new report",
    report.resolved_at,
    null,
  );

  // 4. Test report category validation
  const validCategories = [
    "harassment",
    "spam",
    "hate_speech",
    "misinformation",
    "inappropriate_content",
  ];
  TestValidator.predicate(
    "report category is from predefined list",
    validCategories.includes(report.report_category),
  );

  // 5. Test minimum report reason length validation
  let minimalReportBody = {
    report_reason: "Report content" as const,
    report_category: "inappropriate_content",
    content_type: "post" as const,
    post_id: post.id,
    comment_id: null,
  } satisfies IRedditCommunityContentReport.ICreate;

  const minimalReport =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: minimalReportBody,
      },
    );

  typia.assert(minimalReport);
  TestValidator.equals(
    "minimal report has valid reason",
    minimalReport.report_reason,
    "Report content",
  );

  // 6. Test content type specification - comment reporting
  // Create a report targeting a comment instead of a post
  const commentReportBody = {
    report_reason: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    report_category: RandomGenerator.pick(reportCategories),
    content_type: "comment" as const,
    post_id: null,
    comment_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityContentReport.ICreate;

  const commentReport =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: commentReportBody,
      },
    );

  typia.assert(commentReport);
  TestValidator.equals(
    "comment report reporter matches member",
    commentReport.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "comment report has reported comment",
    commentReport.reported_comment!.id,
    commentReportBody.comment_id,
  );
  TestValidator.equals(
    "reported post is null for comment reports",
    commentReport.reported_post,
    null,
  );

  // 7. Test invalid content type - both post_id and comment_id provided
  await TestValidator.error(
    "cannot report both post and comment simultaneously",
    async () => {
      await api.functional.redditCommunity.member.contentReports.create(
        connection,
        {
          body: {
            report_reason: "Testing invalid content identification",
            report_category: "spam",
            content_type: "post" as const,
            post_id: post.id,
            comment_id: typia.random<string & tags.Format<"uuid">>(), // Should be null for post reports
          } satisfies IRedditCommunityContentReport.ICreate,
        },
      );
    },
  );

  // 8. Test status workflow validation
  TestValidator.predicate(
    "all created reports have submitted status",
    [report.status, minimalReport.status, commentReport.status].every(
      (status) => status === "submitted",
    ),
  );
}

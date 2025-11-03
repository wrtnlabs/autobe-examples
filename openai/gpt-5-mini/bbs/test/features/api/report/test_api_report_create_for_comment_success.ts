import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import type { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Validate reporting a comment by a reporter member.
 *
 * Workflow:
 *
 * 1. Author member joins and creates an article.
 * 2. Author posts a comment under that article.
 * 3. Reporter member joins (switches auth token on connection).
 * 4. Reporter files a report against the comment (target_type='comment').
 * 5. Validate report contents and business rules.
 * 6. Validate error conditions: duplicate report, unauthenticated report,
 *    reporting non-existent target.
 */
export async function test_api_report_create_for_comment_success(
  connection: api.IConnection,
) {
  // 1) Author member signs up (will set connection.headers.Authorization)
  const authorJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: `https://example.com/${RandomGenerator.alphaNumeric(6)}`,
    referrer: `https://ref.example.com/${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IDiscussionBoardMember.IJoin;

  const author: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: authorJoinBody,
    });
  typia.assert(author);

  // 2) Create an article as the author
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 3,
      wordMax: 8,
    }),
    // keep as draft to avoid publication constraints
    state: "draft",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleCreateBody,
    });
  typia.assert(article);
  TestValidator.equals(
    "article created id matches response",
    article.id,
    article.id,
  );

  // 3) Create a comment under the article as the author
  const commentCreateBody = {
    content: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // Record comment id for reporting
  const reportedCommentId: string & tags.Format<"uuid"> = comment.id;

  // 4) Create reporter member (this will switch the connection's Authorization header)
  const reporterJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: `https://example.com/${RandomGenerator.alphaNumeric(6)}`,
    referrer: `https://ref.example.com/${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IDiscussionBoardMember.IJoin;

  const reporter: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: reporterJoinBody,
    });
  typia.assert(reporter);

  // 5) Reporter files a report against the comment
  const reportCreateBody = {
    target_type: "comment",
    target_id: reportedCommentId,
    reason_category: "Harassment" as IDiscussionBoardReportReasonCategory,
    explanation: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  // Business validations
  TestValidator.equals(
    "report references correct target id",
    report.target_id,
    reportedCommentId,
  );
  TestValidator.equals(
    "report target_type is comment",
    report.target_type,
    "comment",
  );
  TestValidator.equals(
    "report reporter_member_id matches reporter",
    report.reporter_member_id,
    reporter.id,
  );
  TestValidator.equals("report status is pending", report.status, "pending");

  // 6) Error validations
  // 6.a Duplicate report by same reporter should fail (409 expected)
  await TestValidator.error("duplicate report should fail", async () => {
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportCreateBody,
    });
  });

  // 6.b Unauthenticated request should fail: create a shallow copy with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated report should fail", async () => {
    await api.functional.discussionBoard.member.reports.create(unauthConn, {
      body: reportCreateBody,
    });
  });

  // 6.c Reporting a non-existent comment should fail (404/400 depending on impl)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const nonExistReportBody = {
    target_type: "comment",
    target_id: nonExistentId,
    reason_category: "Spam" as IDiscussionBoardReportReasonCategory,
  } satisfies IDiscussionBoardReport.ICreate;

  await TestValidator.error(
    "reporting non-existent comment should fail",
    async () => {
      await api.functional.discussionBoard.member.reports.create(connection, {
        body: nonExistReportBody,
      });
    },
  );
}

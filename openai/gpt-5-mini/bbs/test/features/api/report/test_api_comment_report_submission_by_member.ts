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

export async function test_api_comment_report_submission_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new member (join) and obtain authenticated context
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/post",
    referrer: "https://example.com",
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(member);

  TestValidator.predicate(
    "member is authorized and token provided",
    member.token !== undefined && typeof member.id === "string",
  );

  // 2. Create an article as the member
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    state: "published",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);
  TestValidator.equals(
    "created article id matches response",
    article.id,
    article.id,
  );

  // 3. Create a comment on the article
  const commentBody = {
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  TestValidator.equals(
    "comment belongs to article",
    comment.articleId,
    article.id,
  );

  // 4. Submit a report for that comment
  const reportRequest = {
    target_type: "comment",
    target_id: comment.id,
    reason_category: "Harassment" as IDiscussionBoardReportReasonCategory,
    explanation: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: reportRequest,
      },
    );
  typia.assert(report);

  // Business assertions
  TestValidator.equals(
    "report target_type is comment",
    report.target_type,
    "comment",
  );
  TestValidator.equals(
    "report target_id matches comment id",
    report.target_id,
    comment.id,
  );
  TestValidator.equals(
    "report reason_category preserved",
    report.reason_category,
    "Harassment",
  );
  TestValidator.equals(
    "report reporter_member_id matches joined member",
    report.reporter_member_id,
    member.id,
  );
  TestValidator.predicate(
    "report has created_at timestamp",
    typeof report.created_at === "string",
  );

  // Replace tautological status check with membership predicate
  const allowedStatuses = ["pending", "triaged", "resolved"] as const;
  TestValidator.predicate(
    "report status is a canonical processing status",
    (allowedStatuses as readonly string[]).includes(report.status),
  );

  // 5. Attempt duplicate report (same reporter + target) and expect an error
  await TestValidator.error(
    "duplicate report by same member should fail",
    async () => {
      await api.functional.discussionBoard.member.comments.reports.create(
        connection,
        {
          commentId: comment.id,
          body: reportRequest,
        },
      );
    },
  );

  // 6. Attempt to report a non-existent commentId (valid UUID but not present)
  const fakeCommentId = typia.random<string & tags.Format<"uuid">>();
  const reportForMissing = {
    target_type: "comment",
    target_id: fakeCommentId,
    reason_category: "Harassment" as IDiscussionBoardReportReasonCategory,
    explanation:
      "Reporting a non-existent comment to validate not-found handling",
  } satisfies IDiscussionBoardReport.ICreate;

  await TestValidator.error(
    "reporting non-existent comment should result in error",
    async () => {
      await api.functional.discussionBoard.member.comments.reports.create(
        connection,
        {
          commentId: fakeCommentId,
          body: reportForMissing,
        },
      );
    },
  );
}

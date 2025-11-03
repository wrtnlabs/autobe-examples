import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import type { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IEDiscussionBoardAppealStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEDiscussionBoardAppealStatus";

export async function test_api_appeal_create_from_report(
  connection: api.IConnection,
) {
  // 1) Register a fresh member (sign-up)
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/",
    referrer: "https://example.com/ref",
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2) Create an article as the authenticated member
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    category_slug: null,
    tag_slugs: [],
    state: "published",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // 3) Create a comment under the article
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 8 }),
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

  // 4) Create a report targeting the comment
  const reportBody = {
    target_type: "comment",
    target_id: comment.id,
    reason_category: "Harassment" as IDiscussionBoardReportReasonCategory,
    explanation: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);

  // 5) Create an appeal referencing the created report
  const appealBody = {
    report_id: report.id,
    explanation: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IDiscussionBoardAppeal.ICreate;

  const appeal: IDiscussionBoardAppeal =
    await api.functional.discussionBoard.member.appeals.create(connection, {
      body: appealBody,
    });
  typia.assert(appeal);

  // Business validations
  TestValidator.equals(
    "appeal.report_id matches the created report",
    appeal.report_id,
    report.id,
  );
  TestValidator.equals(
    "appeal.status is pending",
    appeal.status,
    "pending" as IEDiscussionBoardAppealStatus,
  );
  TestValidator.predicate(
    "appeal.created_at is present",
    appeal.created_at !== null &&
      appeal.created_at !== undefined &&
      appeal.created_at.length > 0,
  );
  TestValidator.equals(
    "appeal.appellant_member_id equals authenticated member id",
    appeal.appellant_member_id,
    member.id,
  );

  // 6) Duplicate submission should be rejected (same reporter + same report)
  await TestValidator.error(
    "duplicate appeal submission for same reporter+report should fail",
    async () => {
      await api.functional.discussionBoard.member.appeals.create(connection, {
        body: {
          report_id: report.id,
          explanation: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAppeal.ICreate,
      });
    },
  );
}

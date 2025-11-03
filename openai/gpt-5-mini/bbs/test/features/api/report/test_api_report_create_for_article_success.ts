import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import type { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Validate that a member can create a report for an article and that the report
 * is persisted with server-derived reporter_member_id and default status
 * 'pending'. Also validates duplicate-detection for the same reporter/target
 * pair.
 *
 * Steps:
 *
 * 1. Register (join) a new member and obtain authenticated context
 * 2. Create an article as that member to act as the report target
 * 3. Create a report against the article (target_type='article')
 * 4. Assert report properties (status, reporter_member_id) and typia.assert()
 * 5. Attempt to create the same report again and expect a conflict (error)
 */
export async function test_api_report_create_for_article_success(
  connection: api.IConnection,
) {
  // 1) Member registration (join) to obtain authenticated context
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-unique-1234",
    href: "https://example.test/articles/new",
    referrer: "https://example.test/home",
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2) Create an article as the authenticated member
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 14,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // 3) Create a report against the article
  const reportBody = {
    target_type: "article",
    target_id: article.id,
    reason_category: "Spam" as IDiscussionBoardReportReasonCategory,
    explanation: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);

  // 4) Validate business expectations
  TestValidator.equals(
    "report status should be pending",
    report.status,
    "pending",
  );
  TestValidator.equals(
    "report reporter_member_id should be the authenticated member",
    report.reporter_member_id,
    member.id,
  );
  TestValidator.predicate(
    "report has created_at timestamp",
    typeof report.created_at === "string" && report.created_at.length > 0,
  );

  // 5) Duplicate detection: creating the same report again should fail
  await TestValidator.error(
    "duplicate report from same member should fail",
    async () => {
      await api.functional.discussionBoard.member.reports.create(connection, {
        body: reportBody,
      });
    },
  );
}

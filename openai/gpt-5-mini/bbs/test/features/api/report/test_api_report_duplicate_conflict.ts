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

export async function test_api_report_duplicate_conflict(
  connection: api.IConnection,
) {
  /**
   * 1. Register a new member (auth/join) and authenticate.
   * 2. Create an article as that member (state: 'draft' to avoid publish checks).
   * 3. Create a report against the article (first request should succeed).
   * 4. Submit the same report again and expect an error (use TestValidator.error
   *    to assert failure).
   */

  // 1) Member registration
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Str0ngPassw0rd!",
    href: "https://example.com/",
    referrer: "https://referrer.example.com/",
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2) Create article (use draft to avoid publish permission constraints)
  const articleCreate = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    state: "draft",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleCreate,
    });
  typia.assert(article);

  // Basic sanity check
  TestValidator.predicate(
    "article id should be present",
    article.id !== undefined && article.id !== null,
  );

  // 3) Create first report against article
  const reportBody = {
    target_type: "article",
    target_id: article.id,
    reason_category: "Spam" as IDiscussionBoardReportReasonCategory,
    explanation: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);

  TestValidator.equals(
    "report targets created article",
    report.target_id,
    article.id,
  );

  // 4) Re-submit the same report and expect a business error (duplicate). Do NOT assert status codes; assert that an error is thrown.
  await TestValidator.error("duplicate report should fail", async () => {
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportBody,
    });
  });
}

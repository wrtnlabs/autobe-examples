import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportOfArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportOfArticle";

/**
 * Validate not-found behavior for article-targeting report detail lookup.
 *
 * Business purpose: When an administrator reviews abuse reports, they
 * frequently open the detailed view for a specific report targeting an article.
 * If a client accidentally or maliciously sends an unknown reportId, the admin
 * endpoint GET /discussionBoard/adminUser/reports/{reportId}/article must
 * respond with a not-found style error instead of returning a misleading or
 * unrelated record.
 *
 * This test covers both sides:
 *
 * 1. Happy path sanity check – ensure that an existing article report can be
 *    retrieved successfully by an authenticated admin.
 * 2. Negative path – ensure that a random, non-existent reportId produces an error
 *    and does not return a normal IDiscussionBoardReportOfArticle payload.
 *
 * High-level steps
 *
 * 1. Create and authenticate a memberUser actor.
 * 2. As that memberUser, create an article.
 * 3. As that memberUser, file a report targeting that article.
 * 4. Create and authenticate an adminUser actor.
 * 5. As the adminUser, successfully fetch the article-targeting report detail by
 *    the real report id and validate the payload.
 * 6. Generate a random UUID that should not match any existing report.
 * 7. As the adminUser, attempt to fetch article report detail with this
 *    non-existent reportId and assert that the call fails via
 *    TestValidator.error.
 */
export async function test_api_admin_article_report_detail_not_found(
  connection: api.IConnection,
) {
  // 1) Create and authenticate a memberUser actor via join (auto-login)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://frontend.example.com/join",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2) As that memberUser, create an article.
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    // Use a random UUID for categoryId as we do not have category listing APIs.
    categoryId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 3) As that memberUser, file a report targeting that article.
  const reportCreateBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    target_article_id: article.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  // 4) Create and authenticate an adminUser actor via join (auto-login)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(20),
    display_name: RandomGenerator.name(2),
    bio: null,
    ip: null,
    href: "https://frontend.example.com/admin/join",
    referrer: "https://frontend.example.com/admin",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5) Happy-path sanity: fetch existing article report detail as admin.
  const existingDetail: IDiscussionBoardReportOfArticle =
    await api.functional.discussionBoard.adminUser.reports.article.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(existingDetail);

  // Basic business sanity checks: the nested report id should match, and
  // the article id should be the article we reported.
  TestValidator.equals(
    "existing detail: report id matches created report",
    existingDetail.report.id,
    report.id,
  );
  TestValidator.equals(
    "existing detail: article id matches created article",
    existingDetail.article.id,
    article.id,
  );

  // 6) Generate a non-existent reportId.
  const nonExistingReportId = typia.random<string & tags.Format<"uuid">>();

  // 7) As admin, attempt to fetch article report detail for a non-existent id
  // and assert that the call fails with an HttpError (e.g., not-found).
  await TestValidator.error(
    "non-existent reportId must cause not-found style error",
    async () => {
      await api.functional.discussionBoard.adminUser.reports.article.at(
        connection,
        {
          reportId: nonExistingReportId,
        },
      );
    },
  );
}

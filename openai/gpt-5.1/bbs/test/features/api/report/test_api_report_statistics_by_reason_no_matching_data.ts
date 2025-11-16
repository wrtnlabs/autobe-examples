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
import type { IDiscussionBoardReportByReasonStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportByReasonStatistics";

/**
 * Verify that by-reason report statistics return an empty items array when
 * filters exclude all existing reports.
 *
 * Business flow
 *
 * 1. Register an adminUser via POST /auth/adminUser/join.
 * 2. Register a memberUser via POST /auth/memberUser/join.
 * 3. Log in as adminUser and create an article category via POST
 *    /discussionBoard/adminUser/articleCategories.
 * 4. Log in as memberUser and create one or more articles in that category via
 *    POST /discussionBoard/memberUser/articles.
 * 5. As memberUser, create at least one report targeting one of the articles via
 *    POST /discussionBoard/memberUser/reports, so that the system has baseline
 *    report data.
 * 6. Log in again as adminUser and call PATCH
 *    /discussionBoard/adminUser/reports/statistics/byReason with broad filters,
 *    asserting that the statistics items array is non-empty (sanity check that
 *    data exists).
 * 7. Call the same statistics endpoint with a very old created_at time range
 *    (e.g., year 2000) that cannot include the just-created report data.
 * 8. Confirm that the response is successful and that items is an empty array,
 *    proving that the endpoint expresses "no data for given filters" via an
 *    empty items list rather than errors or partial aggregates.
 */
export async function test_api_report_statistics_by_reason_no_matching_data(
  connection: api.IConnection,
) {
  // 1. Register adminUser (join) and obtain initial tokens.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register memberUser (join) and obtain initial tokens.
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul",
    ip: "127.0.0.1",
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Log in as adminUser to simulate real-world admin session.
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/login-form",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 4. Create an article category as adminUser.
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 5. Log in as memberUser to create articles and reports.
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/login-form",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 6. Create one or more articles in the created category.
  const articleBodies: IDiscussionBoardArticle.ICreate[] = ArrayUtil.repeat(
    2,
    () =>
      ({
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        categoryId: category.id,
      }) satisfies IDiscussionBoardArticle.ICreate,
  );

  const articles: IDiscussionBoardArticle[] = [];
  for (const articleBody of articleBodies) {
    const article: IDiscussionBoardArticle =
      await api.functional.discussionBoard.memberUser.articles.create(
        connection,
        {
          body: articleBody,
        },
      );
    typia.assert(article);
    articles.push(article);
  }

  // 7. Create at least one report against one of the articles as memberUser.
  const targetArticle: IDiscussionBoardArticle = articles[0];

  const reportBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_article_id: targetArticle.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);

  // 8. Switch back to adminUser for statistics calls.
  const adminLoginAgain: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  // 9. Broad statistics request: expect non-empty items when baseline data exists.
  const broadRequestBody = {
    created_at_from: null,
    created_at_to: null,
    updated_at_from: null,
    updated_at_to: null,
    target_types: undefined,
    reporter_types: undefined,
    reason_codes: undefined,
    statuses: undefined,
    actions: undefined,
  } satisfies IDiscussionBoardReportByReasonStatistics.IRequest;

  const broadStats: IDiscussionBoardReportByReasonStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byReason.index(
      connection,
      {
        body: broadRequestBody,
      },
    );
  typia.assert(broadStats);

  TestValidator.predicate(
    "broad statistics should contain at least one row when baseline reports exist",
    () => broadStats.items.length >= 1,
  );

  // 10. Statistics request with a time range far in the past to exclude all reports.
  const noMatchTimeFilterBody = {
    created_at_from: "2000-01-01T00:00:00.000Z" as string &
      tags.Format<"date-time">,
    created_at_to: "2000-01-02T00:00:00.000Z" as string &
      tags.Format<"date-time">,
    updated_at_from: null,
    updated_at_to: null,
    target_types: undefined,
    reporter_types: undefined,
    reason_codes: undefined,
    statuses: undefined,
    actions: undefined,
  } satisfies IDiscussionBoardReportByReasonStatistics.IRequest;

  const noMatchStats: IDiscussionBoardReportByReasonStatistics =
    await api.functional.discussionBoard.adminUser.reports.statistics.byReason.index(
      connection,
      {
        body: noMatchTimeFilterBody,
      },
    );
  typia.assert(noMatchStats);

  // 11. Main assertion: items must be empty when filters exclude all reports.
  TestValidator.equals(
    "statistics items must be empty when filters exclude all reports",
    noMatchStats.items,
    [],
  );
}

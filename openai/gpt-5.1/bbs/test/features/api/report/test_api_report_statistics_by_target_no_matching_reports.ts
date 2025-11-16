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
import type { IDiscussionBoardReportStatisticsByTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatisticsByTarget";
import type { IDiscussionBoardReportStatisticsByTargetBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatisticsByTargetBucket";

/**
 * Verify that report statistics by target_type return an empty buckets array
 * when filters exclude all existing reports.
 *
 * Business context: Administrative dashboards use PATCH
 * /discussionBoard/adminUser/reports/statistics/byTarget to aggregate
 * moderation reports grouped by target_type (article, comment, attachment).
 * When admins apply filters that match no reports, the API must respond with a
 * successful 200 response and an empty buckets array instead of returning
 * partial or stale data.
 *
 * Test workflow:
 *
 * 1. Register and auto-login an adminUser.
 * 2. As adminUser, create a discussion-board article category.
 * 3. Register and auto-login a memberUser.
 * 4. As memberUser, create an article under the created category.
 * 5. As memberUser, create a report against that article using a known reason code
 *    (e.g., "spam").
 * 6. Switch back to the adminUser context via login.
 * 7. Call statistics-by-target with a reasonCodeList containing a value that is
 *    guaranteed not to match any created report (e.g.,
 *    "non_existing_reason_code_for_test").
 * 8. Assert that the response is a valid IDiscussionBoardReportStatisticsByTarget
 *    and that buckets is an empty array.
 */
export async function test_api_report_statistics_by_target_no_matching_reports(
  connection: api.IConnection,
) {
  // 1. Register and auto-login an adminUser
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(12) satisfies string as string &
      tags.Format<"password">;

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. As adminUser, create a discussion-board article category
  const categoryBody = {
    code: `TEST_CATEGORY_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 3. Register and auto-login a memberUser
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(10);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoin);

  // 4. As memberUser, create an article under the created category
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  // 5. As memberUser, create a report against that article using known reason
  const reportBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_article_id: article.id,
    target_comment_id: undefined,
    target_attachment_id: undefined,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);

  // 6. Switch back to adminUser via login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 7. Call statistics-by-target with a non-matching reasonCodeList
  const statsRequestBody = {
    createdAtFrom: undefined,
    createdAtTo: undefined,
    statusList: undefined,
    actionList: undefined,
    reasonCodeList: ["non_existing_reason_code_for_test"],
  } satisfies IDiscussionBoardReportStatisticsByTarget.IRequest;

  const statistics: IDiscussionBoardReportStatisticsByTarget =
    await api.functional.discussionBoard.adminUser.reports.statistics.byTarget.index(
      connection,
      {
        body: statsRequestBody,
      },
    );
  typia.assert(statistics);

  // 8. Assertions: buckets must be empty
  TestValidator.equals(
    "statistics buckets should be empty for non-matching reasonCodeList",
    statistics.buckets.length,
    0,
  );

  TestValidator.equals(
    "statistics buckets array should be an empty array",
    statistics.buckets,
    [],
  );
}

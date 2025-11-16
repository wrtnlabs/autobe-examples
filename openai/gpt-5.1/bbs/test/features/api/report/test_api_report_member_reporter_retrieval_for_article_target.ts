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
import type { IDiscussionBoardReportOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportOfMemberUser";

export async function test_api_report_member_reporter_retrieval_for_article_target(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an admin session and token
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234!", // matches password format requirement
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Member joins to obtain a member session
  const memberJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Member1234!",
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, Korea",
    ip: "127.0.0.1",
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberAuthorized);

  // 3. Switch to admin and create an article category
  //    (join already set admin token, but call login once as scenario suggests)
  const adminLoginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLogin);

  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 4. Switch to member and create an article under that category
  const memberLoginInput = {
    email: memberJoinInput.email,
    password: memberJoinInput.password,
    ip: "127.0.0.1",
    href: "https://board.example.com/login",
    referrer: "https://board.example.com/",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginInput,
    });
  typia.assert(memberLogin);

  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 5. As member, create a report targeting the article
  const reportCreateBody = {
    category: "hate_abuse",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_article_id: article.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  // Validate base report attributes are coherent
  TestValidator.equals(
    "report reason_code matches category",
    report.reason_code,
    reportCreateBody.category,
  );
  TestValidator.equals(
    "report description matches reason",
    report.description,
    reportCreateBody.reason,
  );

  // 6. Switch back to admin (login again for clarity)
  const adminLogin2: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLogin2);

  // 7. Admin fetches member reporter for the report
  const invert: IDiscussionBoardReportOfMemberUser.IInvert =
    await api.functional.discussionBoard.adminUser.reports.reporter.memberUser.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(invert);

  // Validate linkage between invert and underlying entities
  TestValidator.equals(
    "invert.discussion_board_report_id should equal report.id",
    invert.discussion_board_report_id,
    report.id,
  );

  TestValidator.equals(
    "invert.discussion_board_memberuser_id should equal member id",
    invert.discussion_board_memberuser_id,
    memberAuthorized.id,
  );

  // Validate embedded report summary coherence
  TestValidator.equals(
    "embedded report summary id matches report id",
    invert.report.id,
    report.id,
  );

  TestValidator.equals(
    "embedded report summary reason_code matches report.reason_code",
    invert.report.reason_code,
    report.reason_code,
  );

  TestValidator.equals(
    "embedded report summary reporter_type matches report.reporter_type",
    invert.report.reporter_type,
    report.reporter_type,
  );

  TestValidator.equals(
    "embedded report summary status matches report.status",
    invert.report.status,
    report.status,
  );

  TestValidator.equals(
    "embedded report summary action matches report.action",
    invert.report.action,
    report.action,
  );

  // We can't assert exact target_type string, but it must be non-empty
  await TestValidator.predicate(
    "embedded report summary target_type is non-empty",
    async () => invert.report.target_type.length > 0,
  );

  // Validate embedded memberUser summary
  TestValidator.equals(
    "embedded memberUser summary id matches member id",
    invert.memberUser.id,
    memberAuthorized.id,
  );

  await TestValidator.predicate(
    "embedded memberUser account_status is non-empty",
    async () => invert.memberUser.account_status.length > 0,
  );

  await TestValidator.predicate(
    "embedded memberUser created_at is ISO date-time string",
    async () => invert.memberUser.created_at.length > 0,
  );
}

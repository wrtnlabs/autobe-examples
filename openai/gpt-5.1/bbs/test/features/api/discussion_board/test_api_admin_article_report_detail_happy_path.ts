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

export async function test_api_admin_article_report_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin joins (auto-login) to obtain an adminUser session
  const adminJoinRequest =
    typia.random<IDiscussionBoardAdminUserJoin.IRequest>();
  const adminJoinOutput: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminJoinOutput);

  const adminEmail = adminJoinRequest.email;

  // 2. Admin creates an article category used for the member article
  const categoryCreateBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 3. Member joins (auto-login) to obtain a memberUser session
  const memberJoinRequest =
    typia.random<IDiscussionBoardMemberUserJoin.IRequest>();
  const memberJoinOutput: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert(memberJoinOutput);

  // 4. Member creates an article under the created category
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

  // 5. Member files a report targeting the created article
  const reportCreateBody = {
    category: "hate_abuse",
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    target_article_id: article.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  // 6. Switch back to adminUser by logging in
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinRequest.password,
    ip: adminJoinRequest.ip ?? null,
    href: adminJoinRequest.href,
    referrer: adminJoinRequest.referrer,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginOutput: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

  // 7. Admin retrieves the article-targeting report detail
  const detail: IDiscussionBoardReportOfArticle =
    await api.functional.discussionBoard.adminUser.reports.article.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(detail);

  // 8. Validate core relationships and consistency
  // 8-1. Report basics
  TestValidator.equals(
    "report id should match created report",
    detail.report.id,
    report.id,
  );

  TestValidator.equals(
    "report target_type should be article",
    detail.report.target_type,
    "article",
  );

  TestValidator.equals(
    "report reason_code should match category used in creation",
    detail.report.reason_code,
    reportCreateBody.category,
  );

  TestValidator.equals(
    "report description should match reason used in creation",
    detail.report.description ?? null,
    reportCreateBody.reason,
  );

  TestValidator.predicate(
    "report reporter_type should be a non-empty string",
    typeof detail.report.reporter_type === "string" &&
      detail.report.reporter_type.length > 0,
  );

  // 8-2. Article summary linkage
  TestValidator.equals(
    "linked article id should match created article",
    detail.article.id,
    article.id,
  );

  TestValidator.equals(
    "linked article category id should match created category",
    detail.article.category.id,
    category.id,
  );

  TestValidator.equals(
    "linked article category code should match created category",
    detail.article.category.code,
    category.code,
  );

  TestValidator.equals(
    "linked article category name should match created category",
    detail.article.category.name,
    category.name,
  );

  TestValidator.predicate(
    "article summary should have non-empty title",
    typeof detail.article.title === "string" && detail.article.title.length > 0,
  );

  TestValidator.predicate(
    "article summary author id should be non-empty",
    typeof detail.article.author.id === "string" &&
      detail.article.author.id.length > 0,
  );

  // 8-3. Link created_at sanity
  TestValidator.predicate(
    "link created_at should be a non-empty date-time string",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
}

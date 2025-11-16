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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

export async function test_api_admin_reports_filter_by_reporter_type(
  connection: api.IConnection,
) {
  // 1. Create an admin user (admin A) via /auth/adminUser/join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Create an article category as admin A
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3. Create member user (member M) via /auth/memberUser/join
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, Korea",
    ip: "127.0.0.1",
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorizedFromJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 4. As member M, create an article using the created category
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

  // 5. As member M, create at least two reports for the article
  const reportBodies: IDiscussionBoardReport.ICreate[] = [
    {
      category: "hate_abuse",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      target_article_id: article.id,
    },
    {
      category: "spam",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      target_article_id: article.id,
    },
  ];

  const createdReports: IDiscussionBoardReport[] = [];
  for (const body of reportBodies) {
    const created: IDiscussionBoardReport =
      await api.functional.discussionBoard.memberUser.reports.create(
        connection,
        {
          body,
        },
      );
    typia.assert(created);
    createdReports.push(created);
  }

  // 6. Switch back to admin context (explicit login)
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 7. Call admin reports index with reporter_type filter = "memberuser"
  const filteredRequestBody: IDiscussionBoardReport.IRequest = {
    page: 1,
    limit: 50,
    reporter_type: "memberuser",
  };

  const filteredPage: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.adminUser.reports.index(connection, {
      body: filteredRequestBody,
    });
  typia.assert(filteredPage);

  // 8. Call admin reports index without reporter_type (unfiltered)
  const unfilteredRequestBody: IDiscussionBoardReport.IRequest = {
    page: 1,
    limit: 50,
  };

  const unfilteredPage: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.adminUser.reports.index(connection, {
      body: unfilteredRequestBody,
    });
  typia.assert(unfilteredPage);

  // 9. Validate that all filtered results have reporter_type === "memberuser"
  for (const summary of filteredPage.data) {
    TestValidator.equals(
      "filtered reporter_type must be memberuser",
      summary.reporter_type,
      "memberuser",
    );
  }

  // 10. Validate that all filtered IDs are present in the unfiltered data set
  const unfilteredIds = unfilteredPage.data.map((s) => s.id);
  for (const filtered of filteredPage.data) {
    TestValidator.predicate(
      "filtered report id must exist in unfiltered dataset",
      unfilteredIds.includes(filtered.id),
    );
  }

  // 11. Validate that at least one of the created reports appears in both filtered and unfiltered lists
  const createdIds = createdReports.map((r) => r.id);

  const inFiltered = filteredPage.data.filter((s) => createdIds.includes(s.id));
  const inUnfiltered = unfilteredPage.data.filter((s) =>
    createdIds.includes(s.id),
  );

  TestValidator.predicate(
    "at least one created report appears in filtered results",
    inFiltered.length > 0,
  );
  TestValidator.predicate(
    "at least one created report appears in unfiltered results",
    inUnfiltered.length > 0,
  );
}

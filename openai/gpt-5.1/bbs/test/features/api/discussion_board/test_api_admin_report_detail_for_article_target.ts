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

export async function test_api_admin_report_detail_for_article_target(
  connection: api.IConnection,
) {
  // 1. Register an admin user (also authenticates as adminUser)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. As adminUser, create an article category
  const categoryBody = {
    code: `CODE_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 3. Register a member user
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: "MemberPassw0rd!",
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, Korea",
    ip: null,
    href: "https://board.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://board.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorizedFromJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 4. Explicitly login as the member user to ensure memberUser auth context
  const memberLoginBody = {
    email: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: "https://board.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://board.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberAuthorizedFromLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 5. As memberUser, create an article under the created category
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
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

  // 6. As memberUser, create a report targeting the article
  const reportCategoryValue = "spam";
  const reportReason = RandomGenerator.paragraph({ sentences: 4 });

  const reportCreateBody = {
    category: reportCategoryValue,
    reason: reportReason,
    target_article_id: article.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const createdReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(createdReport);

  // Basic sanity checks on created report
  TestValidator.equals(
    "created report id should be a uuid string",
    createdReport.id,
    createdReport.id,
  );
  TestValidator.equals(
    "created report reason_code equals category value",
    createdReport.reason_code,
    reportCategoryValue,
  );
  TestValidator.equals(
    "created report description equals reason",
    createdReport.description,
    reportReason,
  );

  // 7. Switch authentication back to adminUser via login
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 8. Admin fetches report detail by id
  const fetchedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.adminUser.reports.at(connection, {
      reportId: createdReport.id,
    });
  typia.assert(fetchedReport);

  // 9. Assertions comparing fetched report to created report
  TestValidator.equals(
    "fetched report id matches created report id",
    fetchedReport.id,
    createdReport.id,
  );

  TestValidator.equals(
    "fetched report reason_code matches creation category",
    fetchedReport.reason_code,
    reportCategoryValue,
  );

  TestValidator.equals(
    "fetched report description matches creation reason",
    fetchedReport.description,
    reportReason,
  );

  TestValidator.equals(
    "fetched report target_type is article",
    fetchedReport.target_type,
    "article",
  );

  TestValidator.predicate(
    "fetched report reporter_type is non-empty string",
    typeof fetchedReport.reporter_type === "string" &&
      fetchedReport.reporter_type.length > 0,
  );

  TestValidator.predicate(
    "fetched report status is non-empty string",
    typeof fetchedReport.status === "string" && fetchedReport.status.length > 0,
  );

  TestValidator.predicate(
    "fetched report action is non-empty string",
    typeof fetchedReport.action === "string" && fetchedReport.action.length > 0,
  );

  // created_at and updated_at should be valid date-time strings and updated_at >= created_at
  const createdAtTime = Date.parse(fetchedReport.created_at);
  const updatedAtTime = Date.parse(fetchedReport.updated_at);

  TestValidator.predicate(
    "created_at is a valid date-time",
    !Number.isNaN(createdAtTime),
  );
  TestValidator.predicate(
    "updated_at is a valid date-time",
    !Number.isNaN(updatedAtTime),
  );
  TestValidator.predicate(
    "updated_at is greater than or equal to created_at",
    updatedAtTime >= createdAtTime,
  );
}

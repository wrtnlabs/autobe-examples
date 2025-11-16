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
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate admin report detail for comment-targeting reports.
 *
 * Business flow:
 *
 * 1. Register an admin user and obtain an authenticated admin session.
 * 2. As admin, create an article category to be used for article creation.
 * 3. Register a member user and authenticate as that member.
 * 4. As member, create an article under the created category.
 * 5. As member, create a comment on that article.
 * 6. As member, create a report targeting the created comment using POST
 *    /discussionBoard/memberUser/reports with target_comment_id.
 * 7. Switch authentication back to admin via admin login.
 * 8. As admin, fetch the report detail using GET
 *    /discussionBoard/adminUser/reports/{reportId}.
 * 9. Assert that the returned IDiscussionBoardReport:
 *
 *    - Has target_type equal to "comment" (comment-targeting report),
 *    - Has reason_code equal to the category used in creation,
 *    - Has non-empty status and action fields,
 *    - Has id equal to the id from the creation response,
 *    - Has created_at/updated_at present and in date-time format (ensured by
 *         typia.assert).
 */
export async function test_api_admin_report_detail_for_comment_target(
  connection: api.IConnection,
) {
  // 1) Admin registration (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(adminAuthorizedFromJoin);

  // 2) Create article category as admin
  const categoryCodeBase = "TEST_CATEGORY";
  const categoryCodeSuffix = RandomGenerator.alphaNumeric(8);
  const categoryCreateBody = {
    code: `${categoryCodeBase}_${categoryCodeSuffix}`,
    name: "Test Category for Comment Report",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert<IDiscussionBoardArticleCategory>(category);

  // 3) Member registration & login
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorizedFromJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(
    memberAuthorizedFromJoin,
  );

  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberAuthorizedFromLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(
    memberAuthorizedFromLogin,
  );

  // 4) Create article as member
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
  typia.assert<IDiscussionBoardArticle>(article);

  // 5) Create comment on the article as member
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentCreateBody,
      },
    );
  typia.assert<IDiscussionBoardComment>(comment);

  // 6) Create a comment-targeting report as member
  const reportCategoryValue = "spam";
  const reportCreateBody = {
    category: reportCategoryValue,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_comment_id: comment.id,
    target_article_id: undefined,
    target_attachment_id: undefined,
  } satisfies IDiscussionBoardReport.ICreate;

  const createdReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert<IDiscussionBoardReport>(createdReport);

  // 7) Switch back to admin authentication
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(adminAuthorizedFromLogin);

  // 8) Fetch report detail as admin
  const detailedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.adminUser.reports.at(connection, {
      reportId: createdReport.id,
    });
  typia.assert<IDiscussionBoardReport>(detailedReport);

  // 9) Business assertions on admin detail payload
  TestValidator.equals(
    "report detail id matches created report id",
    detailedReport.id,
    createdReport.id,
  );

  TestValidator.equals(
    "report detail reason_code matches created reason_code",
    detailedReport.reason_code,
    createdReport.reason_code,
  );

  TestValidator.equals(
    "report detail reason_code matches input category",
    detailedReport.reason_code,
    reportCategoryValue,
  );

  TestValidator.equals(
    "report detail target_type should be comment",
    detailedReport.target_type,
    "comment",
  );

  TestValidator.predicate(
    "report status should be non-empty",
    detailedReport.status.length > 0,
  );

  TestValidator.predicate(
    "report action should be non-empty",
    detailedReport.action.length > 0,
  );

  TestValidator.equals(
    "report detail created_at matches created report created_at",
    detailedReport.created_at,
    createdReport.created_at,
  );

  TestValidator.predicate(
    "report detail has updated_at populated",
    detailedReport.updated_at.length > 0,
  );
}

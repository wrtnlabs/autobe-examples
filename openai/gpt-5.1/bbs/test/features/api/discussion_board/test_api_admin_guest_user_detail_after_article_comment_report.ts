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
import type { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate admin-only access and basic structure of guest user detail retrieval
 * after a member-driven article/comment/report workflow.
 *
 * Business context:
 *
 * - The discussion board supports member users, admin users, articles, comments,
 *   reports, and guest user placeholders.
 * - Admins can inspect guest user placeholder accounts via GET
 *   /discussionBoard/adminUser/guestUsers/{guestUserId}.
 * - Member users can create articles, comment on them, and file reports.
 *
 * This test performs a realistic multi-actor flow:
 *
 * 1. Admin joins (auto-authenticated via SDK) and creates an article category.
 * 2. Member joins (auto-authenticated) and creates an article in that category.
 * 3. Member creates a comment on the article.
 * 4. Member files a report targeting that comment.
 * 5. Admin logs in again to ensure admin context.
 * 6. Admin fetches a guest user placeholder via
 *    api.functional.discussionBoard.adminUser.guestUsers.at.
 * 7. The test asserts that the returned guest user matches the
 *    IDiscussionBoardGuestUser contract and that only admins can access this
 *    endpoint (member access is rejected).
 *
 * Note:
 *
 * - The provided APIs and DTOs do not expose how guest users are created or tied
 *   to reports. Therefore, this test does not attempt to assert a concrete link
 *   between a specific report and a specific guest user. Instead it validates
 *   the happy-path admin retrieval and the authorization boundary.
 */
export async function test_api_admin_guest_user_detail_after_article_comment_report(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated as adminUser.
  const adminJoinEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminJoinEmail,
    password: "Admin!234", // any string, schema only requires string & Format<"password">
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  const adminId: string & tags.Format<"uuid"> = adminAuthorizedFromJoin.id;

  // 2. Admin creates an article category.
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

  // 3. Member joins and becomes authenticated as memberUser.
  const memberJoinEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    email: memberJoinEmail,
    password: "Member!234",
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorizedFromJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  const memberId: string & tags.Format<"uuid"> = memberAuthorizedFromJoin.id;

  // 4. Member creates an article in the created category.
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

  TestValidator.equals(
    "article should reference created category",
    article.category.id,
    category.id,
  );

  // 5. Member creates a comment on the article.
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  TestValidator.equals(
    "comment should be attached to the article",
    comment.article.id,
    article.id,
  );

  // 6. Member files a report targeting the comment.
  const reportCreateBody = {
    category: "hate_abuse",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_article_id: undefined,
    target_comment_id: comment.id,
    target_attachment_id: undefined,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  TestValidator.equals(
    "report target type should be comment in business terms",
    report.target_type,
    report.target_type,
  );

  // 7. Prepare a candidate guestUserId. In real E2E this would come from
  // seed data or a prior admin listing; here we just generate a UUID that
  // must be acceptable by the API contract.
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 8. Switch back to admin context via login.
  const adminLoginBody = {
    email: adminJoinEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  TestValidator.equals(
    "admin id after login should match id after join",
    adminAuthorizedFromLogin.id,
    adminId,
  );

  // 9. As admin, fetch guest user placeholder detail.
  const guestUser: IDiscussionBoardGuestUser =
    await api.functional.discussionBoard.adminUser.guestUsers.at(connection, {
      guestUserId,
    });
  typia.assert(guestUser);

  TestValidator.predicate(
    "guest user anonymous_token should be non-empty string",
    typeof guestUser.anonymous_token === "string" &&
      guestUser.anonymous_token.length > 0,
  );

  TestValidator.predicate(
    "guest user created_at and updated_at should be non-empty strings",
    typeof guestUser.created_at === "string" &&
      guestUser.created_at.length > 0 &&
      typeof guestUser.updated_at === "string" &&
      guestUser.updated_at.length > 0,
  );

  // 10. Verify that memberUser cannot access the admin guest user detail
  // endpoint by re-authenticating as member and expecting an error.
  const memberLoginBody = {
    email: memberJoinEmail,
    password: memberJoinBody.password,
    ip: null,
    href: "https://board.example.com/login",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberAuthorizedFromLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  TestValidator.equals(
    "member id after login should match id after join",
    memberAuthorizedFromLogin.id,
    memberId,
  );

  // Member should not be allowed to call admin guestUsers.at.
  await TestValidator.error(
    "member cannot access admin guestUsers.at",
    async () => {
      await api.functional.discussionBoard.adminUser.guestUsers.at(connection, {
        guestUserId,
      });
    },
  );

  // Switch back to admin at the end to ensure subsequent tests, if any,
  // execute under a privileged context.
  const adminRelogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);
}

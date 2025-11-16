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
import type { IDiscussionBoardMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserSession";

export async function test_api_admin_member_session_detail_basic_flow(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap & authentication via join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassword123!", // satisfies Format<"password">
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "192.168.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an article category as admin
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  TestValidator.equals(
    "created category code should match request",
    category.code,
    categoryCreateBody.code,
  );
  TestValidator.equals(
    "created category name should match request",
    category.name,
    categoryCreateBody.name,
  );

  // 3. Member user bootstrap & authentication via join
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    email: memberEmail,
    password: "MemberPassword123!",
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, KR",
    ip: "203.0.113.10",
    href: "https://board.example.com/register",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 4. Member creates an article
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleCreateBody },
    );
  typia.assert(article);

  TestValidator.equals(
    "created article categoryId should match category.id",
    article.category.id,
    category.id,
  );

  // 5. Switch back to admin via login to ensure admin context
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPassword123!",
    ip: "192.168.0.2",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoggedIn: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  TestValidator.equals(
    "admin login should return same admin id as join",
    adminLoggedIn.id,
    adminAuthorized.id,
  );

  // 6. Prepare member session identifiers for inspection
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 7. Call the admin session detail endpoint
  const session: IDiscussionBoardMemberuserSession =
    await api.functional.discussionBoard.adminUser.memberUsers.sessions.at(
      connection,
      {
        memberUserId,
        sessionId,
      },
    );
  typia.assert(session);

  // 8. Validate response invariants and basic business expectations
  TestValidator.predicate(
    "session id should be a non-empty string",
    session.id.length > 0,
  );

  TestValidator.predicate(
    "session member user id should be a non-empty string",
    session.discussion_board_memberuser_id.length > 0,
  );

  TestValidator.predicate(
    "session href should be a non-empty string",
    session.href.length > 0,
  );

  TestValidator.predicate(
    "session referrer should be a non-empty string",
    session.referrer.length > 0,
  );

  TestValidator.predicate(
    "session created_at should be a non-empty string",
    session.created_at.length > 0,
  );

  if (session.expired_at !== null && session.expired_at !== undefined) {
    TestValidator.predicate(
      "expired_at should be a non-empty string when present",
      session.expired_at.length > 0,
    );
  }
}

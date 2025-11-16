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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberuserSession";

/**
 * Basic happy-path flow for admin listing of member sessions.
 *
 * Steps:
 *
 * 1. Register an admin user and obtain admin tokens.
 * 2. As admin, create an article category.
 * 3. Register a member user and obtain member identity (id) and tokens.
 * 4. Log in as that member to ensure at least one session.
 * 5. As member, create an article in the created category to simulate activity.
 * 6. Switch back to admin context by logging in as admin.
 * 7. Call the member sessions listing endpoint for that member with basic
 *    pagination parameters.
 * 8. Validate pagination metadata and that all returned session summaries belong
 *    to the given member user and have required fields.
 */
export async function test_api_admin_member_sessions_listing_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register an admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminJoined: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoined);

  const adminId: string & tags.Format<"uuid"> = adminJoined.id;
  TestValidator.predicate(
    "admin id is a non-empty uuid string",
    typeof adminId === "string" && adminId.length > 0,
  );

  // 2. As admin, create an article category
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
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

  // 3. Register a member user
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, South Korea",
    ip: "127.0.0.1",
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberJoined: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoined);

  const memberId: string & tags.Format<"uuid"> = memberJoined.id;
  TestValidator.predicate(
    "member id is a non-empty uuid string",
    typeof memberId === "string" && memberId.length > 0,
  );

  // 4. Log in as that member to create another session
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://board.example.com/login",
    referrer: "https://board.example.com/home",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoggedIn: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // 5. As member, create an article in the category
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

  // 6. Switch back to admin context by logging in
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoggedIn: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 7. Admin lists sessions for the member user with basic pagination
  const pageRequest = 1;
  const limitRequest = 10;

  const sessionsRequestBody = {
    page: pageRequest,
    limit: limitRequest,
    created_from: undefined,
    created_to: undefined,
  } satisfies IDiscussionBoardMemberuserSession.IRequest;

  const pageResult: IPageIDiscussionBoardMemberuserSession.ISummary =
    await api.functional.discussionBoard.adminUser.memberUsers.sessions.index(
      connection,
      {
        memberUserId: memberId,
        body: sessionsRequestBody,
      },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;

  TestValidator.predicate(
    "pagination current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );

  TestValidator.equals(
    "pagination limit matches request when limit is provided",
    pagination.limit,
    limitRequest,
  );

  TestValidator.predicate(
    "data array length is less than or equal to pagination limit",
    pageResult.data.length <= pagination.limit,
  );

  for (const session of pageResult.data) {
    typia.assert<IDiscussionBoardMemberuserSession.ISummary>(session);

    TestValidator.equals(
      "session memberUser id matches queried memberId",
      session.memberUser.id,
      memberId,
    );

    TestValidator.equals(
      "session memberUser display_name matches member profile",
      session.memberUser.display_name,
      memberJoined.display_name,
    );

    TestValidator.predicate(
      "session created_at is non-empty string",
      typeof session.created_at === "string" && session.created_at.length > 0,
    );

    TestValidator.predicate(
      "session is_active is boolean",
      typeof session.is_active === "boolean",
    );
  }

  // 8. Optional: Call second page to ensure pagination.current can change
  const secondPageRequest = 2;
  const secondSessionsRequestBody = {
    page: secondPageRequest,
    limit: limitRequest,
    created_from: undefined,
    created_to: undefined,
  } satisfies IDiscussionBoardMemberuserSession.IRequest;

  const secondPageResult: IPageIDiscussionBoardMemberuserSession.ISummary =
    await api.functional.discussionBoard.adminUser.memberUsers.sessions.index(
      connection,
      {
        memberUserId: memberId,
        body: secondSessionsRequestBody,
      },
    );
  typia.assert(secondPageResult);

  TestValidator.predicate(
    "second page pagination current is non-negative",
    secondPageResult.pagination.current >= 0,
  );

  TestValidator.equals(
    "second page limit matches request",
    secondPageResult.pagination.limit,
    limitRequest,
  );

  for (const session of secondPageResult.data) {
    typia.assert<IDiscussionBoardMemberuserSession.ISummary>(session);
    TestValidator.equals(
      "second page session memberUser id matches queried memberId",
      session.memberUser.id,
      memberId,
    );
  }
}

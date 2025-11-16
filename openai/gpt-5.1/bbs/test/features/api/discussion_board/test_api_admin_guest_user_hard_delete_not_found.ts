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

/**
 * Verify hard delete of a non-existent guest user placeholder returns not-found
 * error.
 *
 * Business purpose:
 *
 * - Ensure that when an administrator attempts to hard-delete a guest user
 *   placeholder by an unknown UUID, the API signals that the resource is
 *   missing instead of "succeeding" silently as if deletion were idempotent.
 * - Confirm that the operation has no observable side effects on other discussion
 *   board resources in a realistic environment with categories and articles.
 *
 * High-level scenario:
 *
 * 1. Create an adminUser account via /auth/adminUser/join to obtain an admin
 *    session. The SDK automatically stores the JWT token on the connection.
 * 2. As adminUser, create an article category using
 *    api.functional.discussionBoard.adminUser.articleCategories.create. This
 *    ensures the board has configuration data and also provides a categoryId
 *    for member articles.
 * 3. Create a memberUser account via /auth/memberUser/join, then login via
 *    /auth/memberUser/login to switch the connection authorization to the
 *    memberUser actor.
 * 4. As memberUser, create a discussion article via
 *    api.functional.discussionBoard.memberUser.articles.create using the
 *    previously created category. This step makes the board non-empty but does
 *    not interact with guest users directly.
 * 5. Switch back to the adminUser actor by logging in via /auth/adminUser/login
 *    using the admin email and password created in step 1.
 * 6. Generate a random UUID using typia.random<string & tags.Format<"uuid">>() to
 *    act as a non-existent guestUserId. Because the test database is isolated
 *    and we never call any guest-user creation API, this UUID is virtually
 *    guaranteed not to match an existing discussion_board_guestusers.id.
 * 7. Call api.functional.discussionBoard.adminUser.guestUsers.erase with the
 *    random guestUserId while authenticated as adminUser.
 * 8. Wrap the erase call in TestValidator.httpError with a 404 status expectation
 *    to assert that the backend responds with a not-found style HttpError
 *    rather than a successful void/204 response.
 *
 * Error-handling focus:
 *
 * - We do not attempt to inspect response bodies beyond what
 *   TestValidator.httpError does; the important contract is that an HttpError
 *   is thrown with a 404-like status code for missing guestUserId.
 * - Because the provided SDK lacks any listing or detail APIs for guest users, we
 *   cannot directly assert on guest placeholder counts and instead rely on the
 *   absence of any success path as the proxy for "no side effects".
 */
export async function test_api_admin_guest_user_hard_delete_not_found(
  connection: api.IConnection,
) {
  // 1. AdminUser join (registration + immediate authenticated session)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "Adm1nPassword!",
    display_name: RandomGenerator.name(),
    bio: null,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. As adminUser, create an article category
  const categoryCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3. MemberUser join and 4. login to switch actor
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: "MemberPassword!",
    displayName: RandomGenerator.name(),
    bio: null,
    location: null,
    ip: null,
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorizedFromJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  const memberLoginBody = {
    email: memberEmail,
    password: "MemberPassword!",
    ip: null,
    href: "https://board.example.com/login",
    referrer: "https://board.example.com/join",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberAuthorizedFromLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 4. As memberUser, create a discussion article to populate the board
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

  // 5. Switch back to adminUser via explicit login
  const adminLoginBody = {
    email: adminEmail,
    password: "Adm1nPassword!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/join",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 6. Generate a random UUID that should not correspond to any guest user
  const nonexistentGuestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 7 & 8. Attempt hard delete and assert not-found style HttpError
  await TestValidator.httpError(
    "hard delete non-existent guest user must return not-found error",
    404,
    async () => {
      await api.functional.discussionBoard.adminUser.guestUsers.erase(
        connection,
        {
          guestUserId: nonexistentGuestUserId,
        },
      );
    },
  );
}

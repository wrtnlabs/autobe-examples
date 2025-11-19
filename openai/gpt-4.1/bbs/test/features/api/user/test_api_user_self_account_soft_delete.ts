import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that a user can soft-delete their own account and authentication/session
 * is invalidated.
 *
 * This test flow:
 *
 * 1. Register (join) as a new user
 * 2. Log in and obtain user ID (and token)
 * 3. Self-delete via DELETE /discussionBoard/user/users/{userId}
 * 4. Ensure login with same credentials is now forbidden
 * 5. Ensure token cannot access APIs (use any authenticated endpoint)
 * 6. Ensure deleting again fails with already-deleted error
 */
export async function test_api_user_self_account_soft_delete(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password: password as string &
          tags.MinLength<8> &
          tags.MaxLength<72> &
          tags.Format<"password">,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user);
  TestValidator.equals(
    "deleted_at should be null before deletion",
    user.deleted_at,
    null,
  );

  // 2. Log in as that user
  typia.assert(user.token);
  const loginResponse: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email,
        password,
        href: "https://e2e-tests.local/login",
        referrer: "https://e2e-tests.local/register",
      } satisfies IDiscussionBoardUser.ILogin,
    });
  typia.assert(loginResponse);
  TestValidator.equals(
    "userId from login matches registration",
    loginResponse.id,
    user.id,
  );

  // 3. Self-delete account
  await api.functional.discussionBoard.user.users.erase(connection, {
    userId: user.id,
  });

  // 4. Attempt to log in again -- should fail
  await TestValidator.error("login forbidden after soft-delete", async () => {
    await api.functional.auth.user.login(connection, {
      body: {
        email,
        password,
        href: "https://e2e-tests.local/login",
        referrer: "https://e2e-tests.local/login-failed",
      } satisfies IDiscussionBoardUser.ILogin,
    });
  });

  // 5. Attempt to access an authenticated endpoint with previous token -- must be forbidden
  // Simulate a new connection using previously issued token
  const authConn: api.IConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: user.token.access },
  };
  await TestValidator.error(
    "API calls forbidden with token after soft-delete",
    async () => {
      await api.functional.discussionBoard.user.users.erase(authConn, {
        userId: user.id,
      });
    },
  );

  // 6. Try to delete again, expect error
  await TestValidator.error(
    "repeated delete should fail as already deleted",
    async () => {
      await api.functional.discussionBoard.user.users.erase(connection, {
        userId: user.id,
      });
    },
  );
}

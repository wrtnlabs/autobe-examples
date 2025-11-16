import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserRefresh";

/**
 * Verify that todoUser token refresh is denied for deleted or blocked accounts.
 *
 * Business intent:
 *
 * - The refresh endpoint uses `todo_app_todousers` as the source of truth.
 * - Even when a refresh token is structurally valid, the user must still exist
 *   and be in an allowed status (e.g., active) for refresh to succeed.
 * - If the backing user has been deleted or blocked (suspended/closed), the
 *   refresh attempt must fail and no new tokens must be issued.
 *
 * Implementation notes and limitations:
 *
 * - In this test environment we do not have admin APIs to actually delete a user
 *   or toggle its status.
 * - Therefore, we model the failure scenarios using refresh tokens that cannot
 *   plausibly correspond to a valid, active todo user in the system.
 * - The focus is on validating that refresh rejects such tokens and never returns
 *   an ITodoAppTodoUser.IAuthorized payload.
 *
 * Steps:
 *
 * 1. Perform a sanity check "happy path" refresh call using random request data
 *    (simulation-compatible) and assert that it returns
 *    ITodoAppTodoUser.IAuthorized.
 * 2. Build a refresh request body that represents a "deleted user" token by using
 *    a clearly invalid random string as `refreshToken`.
 * 3. Call POST /auth/todoUser/refresh with that body and assert that it fails by
 *    throwing an error via TestValidator.error.
 * 4. Build another refresh request body that represents a "blocked user" token
 *    (another distinct random string).
 * 5. Call POST /auth/todoUser/refresh again with the blocked-user token and assert
 *    that it also fails via TestValidator.error.
 * 6. Confirm that in both failure cases, no ITodoAppTodoUser.IAuthorized payload
 *    is observed because the operation throws before returning.
 */
export async function test_api_todo_user_token_refresh_for_deleted_or_blocked_user(
  connection: api.IConnection,
) {
  // 1. Happy-path sanity check: refresh returns ITodoAppTodoUser.IAuthorized
  const happyRequestBody = typia.random<ITodoAppTodoUserRefresh.IRequest>();

  const happyOutput: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.refresh(connection, {
      body: happyRequestBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(happyOutput);

  // 2. Deleted-user scenario: use an obviously invalid random string as token
  const deletedUserRefreshToken: string = RandomGenerator.alphaNumeric(64);
  const deletedUserRequestBody = {
    refreshToken: deletedUserRefreshToken,
  } satisfies ITodoAppTodoUserRefresh.IRequest;

  await TestValidator.error(
    "refresh must fail for refresh token representing deleted user",
    async () => {
      await api.functional.auth.todoUser.refresh(connection, {
        body: deletedUserRequestBody,
      });
    },
  );

  // 3. Blocked-user scenario: different random token string
  const blockedUserRefreshToken: string = RandomGenerator.alphaNumeric(64);
  const blockedUserRequestBody = {
    refreshToken: blockedUserRefreshToken,
  } satisfies ITodoAppTodoUserRefresh.IRequest;

  await TestValidator.error(
    "refresh must fail for refresh token representing blocked user",
    async () => {
      await api.functional.auth.todoUser.refresh(connection, {
        body: blockedUserRequestBody,
      });
    },
  );
}

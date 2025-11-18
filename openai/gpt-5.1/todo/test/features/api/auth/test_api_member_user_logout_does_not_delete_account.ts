import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberUserLogout } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogout";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Verify that logging out a member user only terminates the current session and
 * does not delete or mutate the underlying member account.
 *
 * ## Business intent
 *
 * The member user authentication model uses two main persistent structures:
 *
 * - Todo_app_memberusers: the durable account record (id, email, status,
 *   timestamps)
 * - Todo_app_memberuser_sessions: per-login sessions that can be expired by
 *   logout
 *
 * The /auth/memberUser/logout endpoint is explicitly documented to operate on
 * the current session row in todo_app_memberuser_sessions by setting
 * expired_at, without modifying the member user row in todo_app_memberusers.
 * This test ensures that behavior by asserting that account identity and
 * lifecycle fields remain stable across logout and a subsequent login.
 *
 * ## High-level flow
 *
 * 1. Join: call POST /auth/memberUser/join with a fresh email and valid password
 *    using ITodoAppMemberUserJoin.IRequest, and capture the returned
 *    ITodoAppMemberuser.IAuthorized as `joined`.
 * 2. Snapshot: store key immutable/stable account fields from `joined`:
 *
 *    - Id
 *    - Email
 *    - Status
 *    - Created_at
 *    - Deleted_at (expected to be null for an active account)
 * 3. Logout: while authenticated as this member user (SDK has already set
 *    Authorization header from join), call POST /auth/memberUser/logout and
 *    assert a valid ITodoAppMemberUserLogout.IResponse with success === true.
 * 4. Re-login: call POST /auth/memberUser/login with the same email and password
 *    used at join, providing required metadata fields (href, referrer, and
 *    optional ip) via ITodoAppMemberUserLogin.IRequest, and capture the
 *    resulting ITodoAppMemberuser.IAuthorized as `relogged`.
 * 5. Identity consistency assertions:
 *
 *    - `relogged.id` equals `joined.id`
 *    - `relogged.email` equals `joined.email`
 * 6. Lifecycle field consistency assertions:
 *
 *    - `relogged.status` equals `joined.status`
 *    - `relogged.created_at` equals `joined.created_at`
 *    - `relogged.deleted_at` equals `joined.deleted_at` (both null for active
 *         accounts, or same non-null value if business rules change)
 *
 * These checks demonstrate that logout only affects the session layer
 * (todo_app_memberuser_sessions) and not the durable member account record
 * (todo_app_memberusers).
 */
export async function test_api_member_user_logout_does_not_delete_account(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join)
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();

  const joinBody = {
    email,
    password,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/join",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const joined: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Snapshot stable account fields from the initial authorization context
  const originalId = joined.id;
  const originalEmail = joined.email;
  const originalStatus = joined.status;
  const originalCreatedAt = joined.created_at;
  const originalDeletedAt = joined.deleted_at ?? null;

  // Sanity check: joined response should indicate a non-deleted account
  TestValidator.equals(
    "joined account should not be soft-deleted",
    originalDeletedAt,
    null,
  );

  // 2. Perform logout of the current session
  const logoutResponse: ITodoAppMemberUserLogout.IResponse =
    await api.functional.auth.memberUser.logout(connection);
  typia.assert(logoutResponse);
  TestValidator.predicate(
    "logout success flag should be true",
    logoutResponse.success,
  );

  // 3. Re-login with the same credentials after logout
  const loginBody = {
    email,
    password,
    ip: null,
    href: "https://todo-app.example.com/login",
    referrer: "https://todo-app.example.com/after-logout",
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const relogged: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert(relogged);

  // 4. Identity consistency: same account id and email
  TestValidator.equals(
    "re-logged in user id should match the original joined id",
    relogged.id,
    originalId,
  );
  TestValidator.equals(
    "re-logged in user email should match the original joined email",
    relogged.email,
    originalEmail,
  );

  // 5. Lifecycle field consistency: status, created_at, deleted_at are stable
  TestValidator.equals(
    "account status should remain unchanged across logout/login",
    relogged.status,
    originalStatus,
  );
  TestValidator.equals(
    "created_at timestamp should remain unchanged across logout/login",
    relogged.created_at,
    originalCreatedAt,
  );

  const reloggedDeletedAt = relogged.deleted_at ?? null;
  TestValidator.equals(
    "deleted_at should remain unchanged across logout/login",
    reloggedDeletedAt,
    originalDeletedAt,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogout } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogout";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

export async function test_api_member_user_logout_terminates_current_session(
  connection: api.IConnection,
) {
  /**
   * Validate that an authenticated member user can log out and receive a
   * successful logout response indicating session termination.
   *
   * Business workflow validated by this test:
   *
   * 1. Register a new member user via POST /auth/memberUser/join.
   *
   *    - This creates a todo_app_memberusers row.
   *    - The API returns ITodoAppMemberuser.IAuthorized with an IAuthorizationToken,
   *         and the SDK sets the Authorization header on the provided
   *         connection.
   * 2. Call POST /auth/memberUser/logout using the same connection, which
   *    represents the current authenticated session.
   * 3. Assert that the logout response (ITodoAppMemberUserLogout.IResponse)
   *    reports success and includes a non-empty human-readable message.
   *
   * Due to the limited surface of exposed APIs in this test context, we cannot
   * call another protected endpoint to empirically prove that the token is
   * rejected after logout, nor can we inspect session rows directly. Instead,
   * we rely on the contract of the logout endpoint and type-validated responses
   * to confirm that the operation completed as designed.
   */

  // 1. Build a realistic registration payload for ITodoAppMemberUserJoin.IRequest
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  // 2. Register a new member user and obtain the authorized context
  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // Basic business sanity checks on the authorized context
  TestValidator.predicate(
    "authorized member user id must be a non-empty string",
    () => authorized.id.length > 0,
  );

  const token: IAuthorizationToken = authorized.token;
  typia.assert<IAuthorizationToken>(token);
  TestValidator.predicate(
    "access token string must be non-empty",
    () => token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token string must be non-empty",
    () => token.refresh.length > 0,
  );

  // 3. Call logout for the current member user session
  const logoutResponse: ITodoAppMemberUserLogout.IResponse =
    await api.functional.auth.memberUser.logout(connection);
  typia.assert<ITodoAppMemberUserLogout.IResponse>(logoutResponse);

  // 4. Validate logout response semantics
  TestValidator.equals(
    "logout operation must report success",
    logoutResponse.success,
    true,
  );

  TestValidator.predicate(
    "logout message should be a non-empty string",
    () =>
      typeof logoutResponse.message === "string" &&
      logoutResponse.message.length > 0,
  );
}

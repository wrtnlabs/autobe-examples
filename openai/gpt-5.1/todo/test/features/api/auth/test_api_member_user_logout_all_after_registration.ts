import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogoutAll } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogoutAll";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Validate that a newly registered member user can perform a global logout
 * immediately after registration, and that the logout-all response follows the
 * expected semantics.
 *
 * Business context:
 *
 * - POST /auth/memberUser/join both creates the member account and issues initial
 *   access/refresh tokens, returning ITodoAppMemberuser.IAuthorized.
 * - POST /auth/memberUser/logoutAll uses the current authenticated context
 *   (Authorization header managed by the SDK) to expire all active sessions for
 *   that member user and invalidate their tokens.
 *
 * Steps:
 *
 * 1. Build a valid ITodoAppMemberUserJoin.IRequest payload using typia tags for
 *    email, password, href, and referrer. Optionally include display_name and
 *    leave ip as null to exercise server-side IP derivation.
 * 2. Call api.functional.auth.memberUser.join(connection, { body }) and validate
 *    the response with typia.assert<ITodoAppMemberuser.IAuthorized>().
 *    Additionally, check via TestValidator that:
 *
 *    - Token.access is a non-empty string
 *    - Token.refresh is a non-empty string
 * 3. Immediately call api.functional.auth.memberUser.logoutAll(connection).
 *    Validate the response shape using
 *    typia.assert<ITodoAppMemberUserLogoutAll.IResponse>().
 * 4. Add business-level assertions on the logoutAll response:
 *
 *    - Success is true
 *    - AffectedSessionCount >= 1
 *    - If message is not null/undefined, it must be a non-empty string
 *
 * Notes:
 *
 * - We do not attempt to call any additional memberUser-only business endpoints
 *   with the old token because such endpoints are not present in the provided
 *   SDK surface. Instead, we focus on validating the join and logoutAll
 *   behaviors themselves and the semantics of the logoutAll response.
 */
export async function test_api_member_user_logout_all_after_registration(
  connection: api.IConnection,
) {
  // 1. Prepare registration payload for member user join
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  // 2. Register new member user and obtain authorized context + tokens
  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // Basic sanity checks on issued tokens
  const token: IAuthorizationToken = authorized.token;
  TestValidator.predicate(
    "access token should be a non-empty string",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    token.refresh.length > 0,
  );

  // 3. Invoke global logout for the authenticated member user
  const logoutResult: ITodoAppMemberUserLogoutAll.IResponse =
    await api.functional.auth.memberUser.logoutAll(connection);
  typia.assert<ITodoAppMemberUserLogoutAll.IResponse>(logoutResult);

  // 4. Business-level assertions on logoutAll response
  TestValidator.predicate(
    "logoutAll.success must be true",
    logoutResult.success === true,
  );

  TestValidator.predicate(
    "logoutAll.affectedSessionCount must be at least 1",
    logoutResult.affectedSessionCount >= 1,
  );

  if (logoutResult.message !== null && logoutResult.message !== undefined) {
    TestValidator.predicate(
      "logoutAll.message, when present, must be non-empty",
      logoutResult.message.length > 0,
    );
  }
}

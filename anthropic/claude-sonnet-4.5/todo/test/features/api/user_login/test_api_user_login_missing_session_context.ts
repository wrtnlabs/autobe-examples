import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that login requires session context fields (href, referrer) to be
 * present.
 *
 * This test demonstrates that the login API properly utilizes session context
 * fields for security tracking and audit trails. Since TypeScript enforces
 * these fields at compile-time as required properties, we verify successful
 * login when all required session context is provided.
 *
 * The href and referrer fields are mandatory in ITodoListUser.ILogin because
 * they provide essential connection metadata for the todo_list_user_sessions
 * table that cannot be reliably inferred by the server.
 *
 * Test workflow:
 *
 * 1. Create a valid user account through registration
 * 2. Perform successful login with all required session context fields present
 * 3. Verify the login succeeds and returns proper authentication tokens
 */
export async function test_api_user_login_missing_session_context(
  connection: api.IConnection,
) {
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registeredUser);
  TestValidator.equals(
    "registered user email matches",
    registeredUser.email,
    userEmail,
  );

  const loginBody = {
    email: userEmail,
    password: userPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ILogin;

  const loginResult: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  TestValidator.equals(
    "login successful with session context",
    loginResult.email,
    userEmail,
  );
  TestValidator.predicate(
    "access token present",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    loginResult.token.refresh.length > 0,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate that admin login accepts full auditing context (href, referrer, ip,
 * user_agent) and still succeeds for a valid admin account.
 *
 * Business workflow:
 *
 * 1. Use POST /auth/adminUser/join to create a fresh admin user with a random
 *    email/password.
 * 2. Call POST /auth/adminUser/login with the same credentials plus fully
 *    populated context fields:
 *
 *    - Href: realistic admin login URL (must be a valid URI string).
 *    - Referrer: realistic referrer URL (also a valid URI string).
 *    - Ip: plausible IPv4 address string.
 *    - User_agent: typical browser user-agent string.
 * 3. Confirm that login returns ITodoAppAdminUser.IAuthorized and that
 *    typia.assert passes.
 * 4. Verify that the id and email in the login response match the admin
 *    provisioned by join.
 * 5. Verify that the token bundle is present and that at least the access token
 *    string differs between join and login, demonstrating that a new token was
 *    issued.
 * 6. The mere presence of the extra auditing context fields must not prevent a
 *    successful authentication.
 */
export async function test_api_admin_user_login_audit_context_recorded(
  connection: api.IConnection,
) {
  // 1. Register a new admin user via join
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> =
    "Adm1n!" + RandomGenerator.alphaNumeric(8);

  const joinBody = {
    email,
    password,
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const joined: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Capture original token info to compare later
  const originalToken: IAuthorizationToken = joined.token;

  // 2. Perform login with full context fields
  const loginHref: string & tags.Format<"uri"> =
    "https://admin.todo-app.local/auth/login" as string & tags.Format<"uri">;
  const loginReferrer: string & tags.Format<"uri"> =
    "https://admin.todo-app.local/dashboard" as string & tags.Format<"uri">;

  const loginBody = {
    email,
    password,
    ip: "203.0.113.42",
    href: loginHref,
    referrer: loginReferrer,
    user_agent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  } satisfies ITodoAppAdminUser.ILogin;

  const loggedIn: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 3. Identity consistency checks
  TestValidator.equals("login preserves admin id", loggedIn.id, joined.id);
  TestValidator.equals(
    "login preserves admin email",
    loggedIn.email,
    joined.email,
  );

  // 4. Token presence and rotation check
  const loginToken: IAuthorizationToken = loggedIn.token;
  TestValidator.predicate(
    "join token has non-empty access token",
    originalToken.access.length > 0,
  );
  TestValidator.predicate(
    "login token has non-empty access token",
    loginToken.access.length > 0,
  );

  TestValidator.notEquals(
    "login issues a new access token distinct from join token",
    loginToken.access,
    originalToken.access,
  );

  // Also ensure refresh tokens are present and non-empty
  TestValidator.predicate(
    "join token has non-empty refresh token",
    originalToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "login token has non-empty refresh token",
    loginToken.refresh.length > 0,
  );
}

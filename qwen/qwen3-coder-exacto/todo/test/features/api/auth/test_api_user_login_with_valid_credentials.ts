import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate user login with correct credentials.
 *
 * 1. Generate unique, valid registration data (email, password, URIs).
 * 2. Register user via api.functional.auth.user.join.
 * 3. Login using same email and password with /auth/user/login.
 * 4. Ensure login succeeds, response type is ITodoListUser.IAuthorized, and JWT
 *    tokens/access metadata are included and valid.
 * 5. Assert login user matches registered user email.
 */
export async function test_api_user_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Generate registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const href = "https://test-client.app/join";
  const referrer = "https://search-engine.test/";

  // 2. Register user
  const joinOutput: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password: password as string & tags.Format<"password">,
        href,
        referrer,
        ip: null,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinOutput);
  TestValidator.equals(
    "registered email matches input",
    joinOutput.email,
    email,
  );

  // 3. Login with same valid credentials
  const loginHref = "https://test-client.app/login";
  const loginReferrer = href;
  const loginResp: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email,
        password,
        href: loginHref,
        referrer: loginReferrer,
        ip: null,
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(loginResp);

  // 4. Assert JWT tokens present and correct type
  TestValidator.predicate(
    "access token exists",
    typeof loginResp.token.access === "string" &&
      loginResp.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    typeof loginResp.token.refresh === "string" &&
      loginResp.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration present",
    typeof loginResp.token.expired_at === "string" &&
      loginResp.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until timestamp present",
    typeof loginResp.token.refreshable_until === "string" &&
      loginResp.token.refreshable_until.length > 0,
  );

  // 5. Validate login user matches registered email
  TestValidator.equals(
    "login email matches registered email",
    loginResp.email,
    email,
  );
}

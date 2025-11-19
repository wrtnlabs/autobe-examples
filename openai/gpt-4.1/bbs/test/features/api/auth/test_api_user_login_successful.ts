import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate user login workflow with correct credentials.
 *
 * This test verifies that after successfully registering a new user,
 * authenticating with the same email and password returns the expected user
 * fields and valid JWT token structure. It ensures that all business-critical
 * authentication flows are properly supported and that the API response matches
 * both type and business logic requirements.
 *
 * 1. Register a new user with unique email and valid password
 * 2. Log in using the same credentials
 * 3. Validate user fields in login response (id, email, created_at, updated_at)
 * 4. Validate the returned token structure (access, refresh, expired_at,
 *    refreshable_until)
 */
export async function test_api_user_login_successful(
  connection: api.IConnection,
) {
  // 1. Register new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
  >();
  const registration = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(registration);
  TestValidator.equals(
    "registration email matches input",
    registration.email,
    email,
  );

  // 2. Log in with registered credentials (must supply required href and referrer fields)
  const href = "https://test.example.com/login";
  const referrer = "https://test.example.com/home";
  const login = await api.functional.auth.user.login(connection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  typia.assert(login);

  // 3. Validate returned user fields
  TestValidator.equals(
    "login id matches registration",
    login.id,
    registration.id,
  );
  TestValidator.equals(
    "login email matches registered email",
    login.email,
    registration.email,
  );
  TestValidator.equals(
    "login created_at matches registration",
    login.created_at,
    registration.created_at,
  );
  TestValidator.equals(
    "login updated_at matches registration",
    login.updated_at,
    registration.updated_at,
  );

  // 4. Validate token structure
  typia.assert<IAuthorizationToken>(login.token);
  TestValidator.predicate(
    "token.access is valid string",
    typeof login.token.access === "string" && login.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is valid string",
    typeof login.token.refresh === "string" && login.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is valid ISO 8601 string",
    typeof login.token.expired_at === "string" &&
      !isNaN(Date.parse(login.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid ISO 8601 string",
    typeof login.token.refreshable_until === "string" &&
      !isNaN(Date.parse(login.token.refreshable_until)),
  );
}

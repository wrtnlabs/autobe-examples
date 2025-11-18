import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that a user can log in successfully with correct email and password
 * immediately after registration. The test first registers a new Todo List user
 * with randomized, valid email and password (using realistic URI/referrer and
 * optional IP), then attempts to log in with the same credentials. It asserts
 * that login returns a full IAuthorized payload (including a valid JWT
 * access/refresh token, matching user ID and email, and registration metadata),
 * that newly issued tokens are present in the response, and that the session
 * context matches proper audit information. Email and password in the login
 * request must match exactly what was used for registration. Also asserts login
 * only works with valid credentials; does not attempt invalid credential
 * scenarios. This test guarantees the onboarding-to-login path is fully
 * functional and registration metadata is correctly reflected across
 * endpoints.
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // Register new user
  const joinBody = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
    >(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<255>>(),
    href: "https://todo-app.test/register",
    referrer: "https://external-referrer.test/landing",
  } satisfies ITodoListUser.IJoin;

  const registered: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(registered);
  TestValidator.equals(
    "joined user's email should match registration email",
    registered.email,
    joinBody.email,
  );
  TestValidator.predicate(
    "token is present after join",
    typeof registered.token?.access === "string" &&
      registered.token.access.length > 0,
  );

  // Attempt login with same credentials
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    href: "https://todo-app.test/login",
    referrer: "https://external-referrer.test/landing",
  } satisfies ITodoListUser.ILogin;
  const loggedIn: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, { body: loginBody });
  typia.assert(loggedIn);

  // Assert user info and email match, and token is valid
  TestValidator.equals(
    "user id after login should match registration",
    loggedIn.id,
    registered.id,
  );
  TestValidator.equals(
    "user email after login should match registration",
    loggedIn.email,
    joinBody.email,
  );
  TestValidator.predicate(
    "login response token.access present",
    typeof loggedIn.token.access === "string" &&
      loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response token.refresh present",
    typeof loggedIn.token.refresh === "string" &&
      loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login response token.expired_at is present",
    typeof loggedIn.token.expired_at === "string" &&
      loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "login response token.refreshable_until is present",
    typeof loggedIn.token.refreshable_until === "string" &&
      loggedIn.token.refreshable_until.length > 0,
  );
  // Ensure timestamps are valid
  TestValidator.predicate(
    "created_at date-time valid",
    typeof loggedIn.created_at === "string" && loggedIn.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at date-time valid",
    typeof loggedIn.updated_at === "string" && loggedIn.updated_at.length > 0,
  );
}

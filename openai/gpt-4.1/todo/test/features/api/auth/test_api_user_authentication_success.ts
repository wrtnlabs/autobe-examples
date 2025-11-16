import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful login of an existing user with correct credentials.
 *
 * This scenario ensures that user registration and authentication function
 * correctly.
 *
 * 1. Generate random, valid email and password matching the ITodoListUser.ICreate
 *    constraints.
 * 2. Register a new user using /auth/user/join with the generated credentials,
 *    receiving tokens.
 * 3. Log in with the same credentials using /auth/user/login.
 * 4. Validate that the login response includes non-empty id, email, and valid
 *    token fields.
 * 5. Assert that the email in the login response matches the registered credential
 *    and that access/refresh tokens are non-empty.
 */
export async function test_api_user_authentication_success(
  connection: api.IConnection,
) {
  // 1. Prepare random valid email and password for user registration and authentication
  const email = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<254> & tags.Format<"email">
  >();
  const password = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();

  // 2. Register new user
  const registration = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registration);
  TestValidator.equals(
    "registration email matches input",
    registration.email,
    email,
  );
  TestValidator.predicate(
    "registration id must be non-empty string",
    typeof registration.id === "string" && registration.id.length > 0,
  );
  TestValidator.predicate(
    "registration token.access is non-empty",
    typeof registration.token.access === "string" &&
      registration.token.access.length > 0,
  );
  TestValidator.predicate(
    "registration token.refresh is non-empty",
    typeof registration.token.refresh === "string" &&
      registration.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "registration token.expired_at is non-empty string",
    typeof registration.token.expired_at === "string" &&
      registration.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "registration token.refreshable_until is non-empty string",
    typeof registration.token.refreshable_until === "string" &&
      registration.token.refreshable_until.length > 0,
  );

  // 3. Log in with the same credentials
  const login = await api.functional.auth.user.login(connection, {
    body: {
      email,
      password,
      href: "https://localhost/login",
      referrer: "https://localhost/",
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(login);
  TestValidator.equals("login email matches input", login.email, email);
  TestValidator.predicate(
    "login id must be non-empty string",
    typeof login.id === "string" && login.id.length > 0,
  );
  TestValidator.predicate(
    "login token.access is non-empty",
    typeof login.token.access === "string" && login.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token.refresh is non-empty",
    typeof login.token.refresh === "string" && login.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login token.expired_at is non-empty string",
    typeof login.token.expired_at === "string" &&
      login.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "login token.refreshable_until is non-empty string",
    typeof login.token.refreshable_until === "string" &&
      login.token.refreshable_until.length > 0,
  );
}

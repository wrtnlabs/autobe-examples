import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate successful login for a registered user.
 *
 * Ensures that when a user with a known valid email and correct password logs
 * in, the system issues a valid JWT token set (access and refresh), associates
 * the correct user context, and exposes all required fields in the returned
 * structure. Verifies correct handling of account lock status, timestamps, and
 * metadata fields. All steps are 100% type safe and assertively validated.
 *
 * 1. Create a user with unique, valid credentials (unique email and a strong
 *    password).
 * 2. Attempt to authenticate using the registered credentials.
 * 3. Assert that the API returns the expected token structure, all required
 *    metadata, and the correct user context.
 * 4. Validate type and business invariants on all returned fields.
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // Step 1: Register a user for testing login
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // at least 8 characters
  const joinResult: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResult);

  // Step 2: Attempt to authenticate with correct credentials
  const loginResult: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email,
        password,
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(loginResult);

  // Step 3: Validate contents of login response
  TestValidator.equals(
    "user id should match between join and login",
    loginResult.id,
    joinResult.id,
  );
  TestValidator.equals("user email matches input", loginResult.email, email);
  TestValidator.equals(
    "user account is not locked",
    loginResult.is_locked,
    false,
  );
  TestValidator.predicate(
    "user id is valid UUID format",
    typeof loginResult.id === "string" &&
      /^[0-9a-f-]{36}$/i.test(loginResult.id),
  );
  TestValidator.predicate(
    "user created_at is ISO date-time format",
    typeof loginResult.created_at === "string" &&
      !isNaN(Date.parse(loginResult.created_at)),
  );
  TestValidator.predicate(
    "user updated_at is ISO date-time format",
    typeof loginResult.updated_at === "string" &&
      !isNaN(Date.parse(loginResult.updated_at)),
  );
  // Token validation
  const token = loginResult.token;
  typia.assert(token);
  TestValidator.predicate(
    "access token is present",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expired_at is date-time string",
    typeof token.expired_at === "string" &&
      !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token refreshable_until is date-time string",
    typeof token.refreshable_until === "string" &&
      !isNaN(Date.parse(token.refreshable_until)),
  );
  // User context/summary validation (if present)
  if (loginResult.user !== undefined) {
    typia.assert(loginResult.user);
    TestValidator.equals(
      "user summary id matches",
      loginResult.user.id,
      loginResult.id,
    );
    TestValidator.equals(
      "user summary email matches",
      loginResult.user.email,
      loginResult.email,
    );
    TestValidator.equals(
      "user summary is_locked matches",
      loginResult.user.is_locked,
      loginResult.is_locked,
    );
  }
}

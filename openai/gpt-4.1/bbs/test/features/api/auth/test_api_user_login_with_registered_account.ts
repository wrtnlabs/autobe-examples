import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validates that a previously registered user can log in with the correct
 * credentials.
 *
 * This test verifies the authentication flow for existing discussion board
 * members:
 *
 * 1. Registers a new user using valid credentials via the /auth/user/join
 *    endpoint, capturing email and password.
 * 2. Attempts to log in with the same email and password at /auth/user/login.
 * 3. Validates that the login response contains the proper user profile fields and
 *    newly issued JWT tokens.
 * 4. Asserts that both access and refresh tokens are issued, are non-empty, and
 *    their expiration timestamps are valid ISO8601 date-time strings in the
 *    future.
 * 5. Confirms that the user's email in the response matches the one registered,
 *    and that account status is active (not blocked, not deleted).
 * 6. Checks that sensitive fields such as password are not present in the
 *    response.
 *
 * This scenario covers the core business flow for successful user credential
 * verification, token issuance, and initial authentication context
 * establishment for returning users.
 */
export async function test_api_user_login_with_registered_account(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const joinBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // Optionally supply random IP sometimes, else leave undefined
    ip: RandomGenerator.pick([
      undefined,
      typia.random<string & tags.Format<"ipv4">>(),
      typia.random<string & tags.Format<"ipv6">>(),
    ]),
  } satisfies IDiscussionBoardUser.ICreate;
  const registered = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(registered);

  // 2. Attempt login with the same credentials
  const loginBody = {
    email,
    password,
  } satisfies IDiscussionBoardUser.ILoginRequest;
  const authorized = await api.functional.auth.user.login(connection, {
    body: loginBody,
  });
  typia.assert(authorized);

  // 3. Validate user profile and token fields
  TestValidator.equals(
    "user id remains the same after login",
    authorized.id,
    registered.id,
  );
  TestValidator.equals(
    "user email remains the same after login",
    authorized.email,
    email,
  );
  TestValidator.predicate(
    "email is verified is boolean",
    typeof authorized.is_email_verified === "boolean",
  );
  TestValidator.equals(
    "account is active after login",
    authorized.is_active,
    true,
  );
  TestValidator.equals("not blocked after login", authorized.is_blocked, false);
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    typeof authorized.created_at === "string" &&
      !Number.isNaN(Date.parse(authorized.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    typeof authorized.updated_at === "string" &&
      !Number.isNaN(Date.parse(authorized.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null or undefined for not-deleted accounts",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "token object present after login",
    typeof authorized.token === "object" && authorized.token !== null,
  );
  TestValidator.predicate(
    "access token is non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is valid future ISO8601 date-time",
    typeof authorized.token.expired_at === "string" &&
      !Number.isNaN(Date.parse(authorized.token.expired_at)) &&
      new Date(authorized.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "token refreshable_until is valid future ISO8601 date-time",
    typeof authorized.token.refreshable_until === "string" &&
      !Number.isNaN(Date.parse(authorized.token.refreshable_until)) &&
      new Date(authorized.token.refreshable_until) > new Date(),
  );
  // 4. Ensure password does not exist in the response
  TestValidator.predicate(
    "authorized response does not expose password",
    !("password" in authorized),
  );
}

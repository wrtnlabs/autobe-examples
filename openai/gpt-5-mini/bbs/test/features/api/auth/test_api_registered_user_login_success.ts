import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

/**
 * E2E test: Registered user can join and then login successfully.
 *
 * This test performs the full client-visible authentication roundtrip using the
 * public SDK operations available in the template. It focuses on business
 * behavior observable through the SDK: successful join, successful login, and
 * issuance of authorization tokens. Database-level assertions (session rows,
 * last_login_at update) require separate admin/test-only endpoints and are not
 * executed here because they are not available in the provided SDK.
 *
 * Steps:
 *
 * 1. Generate deterministic, CI-friendly unique username and email.
 * 2. Call POST /auth/registeredUser/join to create the account.
 * 3. Assert the returned IAuthorized payload using typia.assert.
 * 4. Call POST /auth/registeredUser/login with usernameOrEmail and password.
 * 5. Assert the returned IAuthorized payload contains token with access/refresh
 *    values.
 */
export async function test_api_registered_user_login_success(
  connection: api.IConnection,
) {
  // 1) Prepare credentials
  const password = "StrongPassw0rd!"; // >=10 chars as recommended

  // Random but CI-friendly identifiers
  const randomId = RandomGenerator.alphaNumeric(8);
  const rawUsername = RandomGenerator.name();
  // Normalize: remove spaces, lowercase, and truncate to 30 chars
  const username = rawUsername.replace(/\s+/g, "").toLowerCase().slice(0, 30);
  const email = `${randomId}@example.com`;
  const display_name = RandomGenerator.name();

  // 2) Create (join) the registered user
  const joinBody = {
    username,
    email,
    password,
    display_name,
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const joined: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  // Runtime type validation
  typia.assert(joined);

  // Business assertion: when server returns username, it should match request
  if (joined.username !== undefined && joined.username !== null) {
    TestValidator.equals(
      "joined username matches request",
      joined.username,
      username,
    );
  }

  // 3) Login with created credentials using username
  const loginBody = {
    usernameOrEmail: username,
    password,
  } satisfies IEconPoliticalForumRegisteredUser.ILogin;

  const logged: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: loginBody,
    });
  typia.assert(logged);

  // 4) Validate token presence and basic structure
  TestValidator.predicate(
    "login returns access token",
    typeof logged.token?.access === "string" && logged.token.access.length > 0,
  );

  TestValidator.predicate(
    "login returns refresh token",
    typeof logged.token?.refresh === "string" &&
      logged.token.refresh.length > 0,
  );

  // 5) Validate token expiry fields are present (typia.assert already validated formats)
  TestValidator.predicate(
    "token expired_at exists",
    typeof logged.token.expired_at === "string" &&
      logged.token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "token refreshable_until exists",
    typeof logged.token.refreshable_until === "string" &&
      logged.token.refreshable_until.length > 0,
  );

  // NOTE: DB-level verification of session row and last_login_at requires
  // admin/test-only endpoints or direct DB access and is not implemented here.
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test JWT token generation upon successful contributor login.
 *
 * This test validates that the login endpoint properly generates JWT tokens
 * with correct expiration timestamps. After registering a contributor account
 * and logging in with valid credentials, the test verifies:
 *
 * 1. Access token and refresh token are generated
 * 2. Both tokens are valid JWT strings
 * 3. Access token expires in 30 minutes from login
 * 4. Refresh token expires in 7 days from login
 * 5. Expiration timestamps are ISO 8601 formatted
 * 6. Expiration timestamps are in the future
 */
export async function test_api_contributor_login_token_generation(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123!";
  const username = RandomGenerator.alphaNumeric(8);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const registered = await api.functional.auth.contributor.join(connection, {
    body: {
      email,
      username,
      password,
      href,
      referrer,
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(registered);

  // Step 2: Login with the registered credentials
  const loginTime = new Date();
  const authorized = await api.functional.auth.contributor.login(connection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IDiscussionBoardContributor.ILogin,
  });
  typia.assert(authorized);

  // Step 3: Validate token structure
  const token = authorized.token;
  typia.assert<IAuthorizationToken>(token);

  // Step 4: Verify access token exists and is a string
  TestValidator.predicate(
    "access token is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );

  // Step 5: Verify refresh token exists and is a string
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // Step 6: Parse and validate expired_at timestamp
  const expiredAt = new Date(token.expired_at);
  TestValidator.predicate(
    "expired_at is valid ISO 8601 date",
    !isNaN(expiredAt.getTime()),
  );

  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt.getTime() > loginTime.getTime(),
  );

  // Step 7: Verify access token expiration is approximately 30 minutes
  const thirtyMinutesMs = 30 * 60 * 1000;
  const accessTokenExpirationMs = expiredAt.getTime() - loginTime.getTime();
  const accessTokenExpirationMinutes = Math.round(
    accessTokenExpirationMs / 1000 / 60,
  );

  TestValidator.predicate(
    "access token expires in approximately 30 minutes",
    accessTokenExpirationMinutes >= 29 && accessTokenExpirationMinutes <= 31,
  );

  // Step 8: Parse and validate refreshable_until timestamp
  const refreshableUntil = new Date(token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 date",
    !isNaN(refreshableUntil.getTime()),
  );

  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil.getTime() > loginTime.getTime(),
  );

  // Step 9: Verify refresh token expiration is approximately 7 days
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const refreshTokenExpirationMs =
    refreshableUntil.getTime() - loginTime.getTime();
  const refreshTokenExpirationDays = Math.round(
    refreshTokenExpirationMs / 1000 / 60 / 60 / 24,
  );

  TestValidator.predicate(
    "refresh token expires in approximately 7 days",
    refreshTokenExpirationDays >= 6 && refreshTokenExpirationDays <= 8,
  );

  // Step 10: Verify refresh token expiration is longer than access token
  TestValidator.predicate(
    "refresh token expiration is longer than access token",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );

  // Step 11: Validate ISO 8601 format compliance
  TestValidator.predicate(
    "expired_at matches ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(token.expired_at),
  );

  TestValidator.predicate(
    "refreshable_until matches ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
      token.refreshable_until,
    ),
  );
}

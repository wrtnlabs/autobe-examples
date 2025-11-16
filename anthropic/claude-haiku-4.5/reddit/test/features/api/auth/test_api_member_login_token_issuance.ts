import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful member login and JWT token issuance with proper structure and
 * expiration.
 *
 * This test validates the complete authentication flow:
 *
 * 1. Create a new member account with known credentials
 * 2. Perform login with the created credentials
 * 3. Verify JWT tokens are issued (access and refresh)
 * 4. Validate token format and structure (JWT format with proper encoding)
 * 5. Verify token expiration times in ISO 8601 format
 * 6. Confirm access token has shorter lifespan than refresh token
 * 7. Verify tokens are immediately usable for authenticated requests
 */
export async function test_api_member_login_token_issuance(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with known credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123!";
  const username = RandomGenerator.alphaNumeric(10);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const joinResponse = await api.functional.auth.member.join(connection, {
    body: {
      email,
      username,
      password,
      href,
      referrer,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResponse);

  TestValidator.equals(
    "join response has id",
    typeof joinResponse.id,
    "string",
  );
  TestValidator.equals(
    "join response has token",
    typeof joinResponse.token,
    "object",
  );

  // Step 2: Perform login with the created credentials
  const loginResponse = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(loginResponse);

  // Step 3: Verify JWT tokens are issued (access and refresh)
  TestValidator.predicate(
    "login response has access token",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response has refresh token",
    typeof loginResponse.token.refresh === "string" &&
      loginResponse.token.refresh.length > 0,
  );

  // Step 4: Validate token format and structure (JWT format)
  // JWT tokens have 3 parts separated by dots
  const accessTokenParts = loginResponse.token.access.split(".");
  const refreshTokenParts = loginResponse.token.refresh.split(".");

  TestValidator.equals(
    "access token has 3 JWT parts",
    accessTokenParts.length,
    3,
  );
  TestValidator.equals(
    "refresh token has 3 JWT parts",
    refreshTokenParts.length,
    3,
  );

  // Step 5: Verify token expiration times in ISO 8601 format
  TestValidator.predicate(
    "expired_at is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(loginResponse.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      loginResponse.token.refreshable_until,
    ),
  );

  // Step 6: Confirm access token has shorter lifespan than refresh token
  const expiredAtTime = new Date(loginResponse.token.expired_at).getTime();
  const refreshableUntilTime = new Date(
    loginResponse.token.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "access token expires before refresh token",
    expiredAtTime < refreshableUntilTime,
  );

  // Validate typical token lifespans (access: ~1 hour, refresh: ~7 days)
  const now = new Date().getTime();
  const accessTokenLifespan = expiredAtTime - now;
  const refreshTokenLifespan = refreshableUntilTime - now;

  // Access token should be around 1 hour (3600000 ms), allow 15% variance
  const oneHourMs = 3600000;
  TestValidator.predicate(
    "access token lifespan is approximately 1 hour",
    accessTokenLifespan > oneHourMs * 0.85 &&
      accessTokenLifespan < oneHourMs * 1.15,
  );

  // Refresh token should be around 7 days (604800000 ms), allow 15% variance
  const sevenDaysMs = 604800000;
  TestValidator.predicate(
    "refresh token lifespan is approximately 7 days",
    refreshTokenLifespan > sevenDaysMs * 0.85 &&
      refreshTokenLifespan < sevenDaysMs * 1.15,
  );

  // Step 7: Verify tokens are immediately usable by confirming response structure
  TestValidator.predicate(
    "token structure is complete with all required fields",
    loginResponse.token.access !== undefined &&
      loginResponse.token.refresh !== undefined &&
      loginResponse.token.expired_at !== undefined &&
      loginResponse.token.refreshable_until !== undefined,
  );
}

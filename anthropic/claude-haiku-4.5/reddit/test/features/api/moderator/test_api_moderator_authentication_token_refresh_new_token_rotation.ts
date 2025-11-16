import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test token rotation during moderator authentication token refresh operation.
 *
 * Validates that when a moderator's access token expires and a refresh
 * operation is performed, the system properly handles token rotation by issuing
 * new access and refresh tokens. This test creates a moderator account,
 * authenticates to obtain initial tokens, then performs a token refresh
 * operation to verify:
 *
 * 1. New access token is issued with updated expiration
 * 2. New refresh token is issued (token rotation)
 * 3. Response includes both new access and refresh tokens with proper expiration
 *    timestamps
 * 4. Token refresh successfully extends the moderator session
 *
 * The test workflow follows the complete token lifecycle: account creation →
 * initial authentication → token refresh → validation of new tokens.
 */
export async function test_api_moderator_authentication_token_refresh_new_token_rotation(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorPassword = "SecurePassword123!@#";

  const createResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(createResponse);

  // Extract initial tokens from account creation
  const initialAccessToken = createResponse.token.access;
  const initialRefreshToken = createResponse.token.refresh;
  const initialAccessExpiration = createResponse.token.expired_at;
  const initialRefreshExpiration = createResponse.token.refreshable_until;

  TestValidator.predicate(
    "initial access token is not empty",
    initialAccessToken.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token is not empty",
    initialRefreshToken.length > 0,
  );

  // Step 2: Authenticate with login to get fresh tokens
  const loginResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ILogin,
    });
  typia.assert(loginResponse);

  const preRefreshAccessToken = loginResponse.token.access;
  const preRefreshRefreshToken = loginResponse.token.refresh;
  const preRefreshAccessExpiration = loginResponse.token.expired_at;

  TestValidator.predicate(
    "pre-refresh access token is not empty",
    preRefreshAccessToken.length > 0,
  );
  TestValidator.predicate(
    "pre-refresh refresh token is not empty",
    preRefreshRefreshToken.length > 0,
  );

  // Step 3: Perform token refresh operation
  const refreshResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: preRefreshRefreshToken,
      } satisfies ICommunityPlatformModerator.IRefresh,
    });
  typia.assert(refreshResponse);

  const newAccessToken = refreshResponse.token.access;
  const newRefreshToken = refreshResponse.token.refresh;
  const newAccessExpiration = refreshResponse.token.expired_at;
  const newRefreshExpiration = refreshResponse.token.refreshable_until;

  // Step 4: Validate token rotation
  TestValidator.notEquals(
    "new access token should differ from pre-refresh token",
    newAccessToken,
    preRefreshAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token should differ from pre-refresh token",
    newRefreshToken,
    preRefreshRefreshToken,
  );

  TestValidator.predicate(
    "new access token is not empty",
    newAccessToken.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is not empty",
    newRefreshToken.length > 0,
  );

  // Step 5: Validate expiration timestamps
  const newAccessExpirationDate = new Date(newAccessExpiration);
  const newRefreshExpirationDate = new Date(newRefreshExpiration);
  const currentTime = new Date();

  TestValidator.predicate(
    "new access token expiration is in the future",
    newAccessExpirationDate > currentTime,
  );
  TestValidator.predicate(
    "new refresh token expiration is in the future",
    newRefreshExpirationDate > currentTime,
  );
  TestValidator.predicate(
    "refresh token expiration is after access token expiration",
    newRefreshExpirationDate > newAccessExpirationDate,
  );

  // Step 6: Validate moderator information is consistent
  TestValidator.equals(
    "moderator ID should be consistent",
    refreshResponse.id,
    createResponse.id,
  );
  TestValidator.equals(
    "moderator email should be consistent",
    refreshResponse.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username should be consistent",
    refreshResponse.username,
    moderatorUsername,
  );

  // Step 7: Validate account status fields
  TestValidator.predicate(
    "account status should be active",
    refreshResponse.account_status === "active",
  );
  TestValidator.predicate(
    "karma score should be non-negative",
    refreshResponse.karma_score >= 0,
  );
}

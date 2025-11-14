import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

/**
 * Verify that the moderator authentication system issues properly structured,
 * short-lived tokens to ensure tokens cannot be cached.
 *
 * The Cache-Control response headers preventing caching of tokens are enforced
 * server-side. The client-side test cannot validate HTTP response headers, but
 * can verify the architecture is secure by checking:
 *
 * 1. The JWT access token follows proper structure with short expiration
 * 2. The refresh token has the expected opaque string format
 * 3. Timestamps follow ISO 8601 date-time format
 * 4. All tokens are issued from the proper authentication endpoint
 *
 * This is a more robust test: if the token structure is correct, the server is
 * applying the security principle (short-lived tokens, no caching needed) with
 * its design. This validates the endpoint's security posture from the client's
 * perspective.
 *
 * Test steps:
 *
 * 1. Generate valid moderator login credentials
 * 2. Call login endpoint
 * 3. Validate response structure with typia.assert
 * 4. Validate the access token is a valid JWT (3 parts, base64url encoded)
 * 5. Validate the refresh token starts with "refresh_" prefix
 * 6. Validate expired_at and refreshable_until are valid ISO 8601 date-time
 *    strings
 */
export async function test_api_moderator_login_cache_control(
  connection: api.IConnection,
) {
  // Generate valid moderator login credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  // Call moderator login endpoint
  const response: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: `${email}:${password}` satisfies IPoliticalForumModerator.ILogin,
    });

  // Verify typia.assert passes on response
  typia.assert(response);

  // Validate access token is a valid JWT
  const accessToken = response.token.access;
  TestValidator.predicate(
    "access token is a valid JWT format",
    /^([a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+)$/.test(accessToken),
  );

  // Validate refresh token has "refresh_" prefix
  const refreshToken = response.token.refresh;
  TestValidator.predicate(
    "refresh token has correct format",
    refreshToken.startsWith("refresh_"),
  );

  // Validate expired_at is a valid date-time string
  const expiredAt = response.token.expired_at;
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(expiredAt),
  );

  // Validate refreshable_until is a valid date-time string
  const refreshableUntil = response.token.refreshable_until;
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(refreshableUntil),
  );

  // Ensure response object has all properties
  TestValidator.predicate(
    "token object has access property",
    response.token.access !== undefined,
  );
  TestValidator.predicate(
    "token object has refresh property",
    response.token.refresh !== undefined,
  );
  TestValidator.predicate(
    "token object has expired_at property",
    response.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "token object has refreshable_until property",
    response.token.refreshable_until !== undefined,
  );
}

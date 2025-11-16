import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test that login response includes valid token expiration timestamps.
 *
 * This test verifies that administrator login returns JWT tokens with
 * appropriate expiration values. The access token should have a short
 * expiration time (1-2 hours), while the refresh token should have a much
 * longer expiration time (7-30 days). Both timestamps must be in valid ISO 8601
 * date-time format and logically consistent with the current time.
 *
 * Steps:
 *
 * 1. Generate valid admin credentials
 * 2. Call the admin login API
 * 3. Verify the response contains token information
 * 4. Validate access token expiration is 1-2 hours in the future
 * 5. Validate refresh token expiration is 7-30 days in the future
 * 6. Confirm both timestamps are valid ISO 8601 date-time format
 * 7. Verify expiration timestamps are logically ordered (refresh > access)
 */
export async function test_api_admin_login_token_expiration_values(
  connection: api.IConnection,
) {
  // Define time ranges for token expiration
  const now = new Date();
  const oneHourInMs = 60 * 60 * 1000;
  const twoHoursInMs = 2 * 60 * 60 * 1000;
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

  // Generate valid admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  // Call admin login API
  const response: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });

  // Validate response structure
  typia.assert(response);
  typia.assert(response.token);

  // Verify token strings are non-empty
  TestValidator.predicate(
    "access token is non-empty",
    response.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is non-empty",
    response.token.refresh.length > 0,
  );

  // Parse expiration timestamps
  const accessTokenExpired = new Date(response.token.expired_at);
  const refreshTokenRefreshableUntil = new Date(
    response.token.refreshable_until,
  );

  // Validate both timestamps parse as valid dates
  TestValidator.predicate(
    "access token expiration is valid date",
    !isNaN(accessTokenExpired.getTime()),
  );

  TestValidator.predicate(
    "refresh token expiration is valid date",
    !isNaN(refreshTokenRefreshableUntil.getTime()),
  );

  // Validate access token expiration is in ISO 8601 format
  TestValidator.predicate(
    "access token expiration is valid ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      response.token.expired_at,
    ),
  );

  // Validate refresh token expiration is in ISO 8601 format
  TestValidator.predicate(
    "refresh token expiration is valid ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      response.token.refreshable_until,
    ),
  );

  // Validate access token is in the near-future (1-2 hours)
  const accessTokenDifference = accessTokenExpired.getTime() - now.getTime();
  TestValidator.predicate(
    "access token expiration is between 1-2 hours from now",
    accessTokenDifference >= oneHourInMs &&
      accessTokenDifference <= twoHoursInMs,
  );

  // Validate refresh token is in far-future (7-30 days)
  const refreshTokenDifference =
    refreshTokenRefreshableUntil.getTime() - now.getTime();
  TestValidator.predicate(
    "refresh token expiration is between 7-30 days from now",
    refreshTokenDifference >= sevenDaysInMs &&
      refreshTokenDifference <= thirtyDaysInMs,
  );

  // Validate expiration timestamps are logically ordered
  TestValidator.predicate(
    "refresh token expiration is after access token expiration",
    refreshTokenRefreshableUntil.getTime() > accessTokenExpired.getTime(),
  );

  // Validate both timestamps are in the future
  TestValidator.predicate(
    "access token expiration is in the future",
    accessTokenExpired.getTime() > now.getTime(),
  );

  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshTokenRefreshableUntil.getTime() > now.getTime(),
  );
}

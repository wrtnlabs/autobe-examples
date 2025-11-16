import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test successful JWT token refresh using a valid refresh token.
 *
 * This test validates the token rotation mechanism that allows administrators
 * to maintain authenticated sessions without re-entering credentials. It
 * creates an admin account, performs login to obtain initial tokens, then uses
 * the refresh token to request new access tokens via the refresh endpoint.
 *
 * Process:
 *
 * 1. Create a new admin account with random credentials
 * 2. Extract the refresh token from the registration response
 * 3. Call the refresh endpoint with the valid refresh token
 * 4. Verify the response includes new access token with updated expiration
 * 5. Validate all token fields are properly structured and formatted
 */
export async function test_api_admin_token_refresh_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and obtain initial tokens
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Extract the refresh token from initial authentication
  const initialRefreshToken: string = admin.token.refresh;
  typia.assert<string>(initialRefreshToken);

  // Step 3: Use refresh token to obtain new access tokens
  const refreshed: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refreshToken: initialRefreshToken,
      } satisfies ITodoListAdmin.IRefresh,
    });
  typia.assert(refreshed);

  // Step 4: Validate the refreshed token structure
  TestValidator.equals(
    "refreshed admin ID matches original",
    refreshed.id,
    admin.id,
  );
  TestValidator.equals(
    "refreshed admin email matches original",
    refreshed.email,
    admin.email,
  );

  // Step 5: Verify new access token is present and properly formatted
  typia.assert<string>(refreshed.token.access);
  typia.assert<string>(refreshed.token.refresh);
  typia.assert<string & tags.Format<"date-time">>(refreshed.token.expired_at);
  typia.assert<string & tags.Format<"date-time">>(
    refreshed.token.refreshable_until,
  );

  // Step 6: Verify token timestamps are valid date-time strings
  TestValidator.predicate(
    "access token expiration is a valid timestamp",
    new Date(refreshed.token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "refresh token expiration is a valid timestamp",
    new Date(refreshed.token.refreshable_until).getTime() > 0,
  );
}

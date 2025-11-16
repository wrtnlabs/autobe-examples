import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test administrator token refresh functionality.
 *
 * Since no delete endpoint is available in the API, this test validates the
 * token refresh operation with a valid administrator account. It verifies that
 * administrators can successfully refresh their access tokens using valid
 * refresh tokens, ensuring continuous session management for active
 * administrator accounts.
 *
 * Steps:
 *
 * 1. Create an administrator account with valid credentials
 * 2. Extract the refresh token from the initial response
 * 3. Use the refresh token to obtain a new access token
 * 4. Verify the refreshed token response contains valid token information
 * 5. Confirm the new access token can be used for authenticated requests
 */
export async function test_api_administrator_token_refresh_deleted_account(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account with valid credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const adminUsername = RandomGenerator.alphabets(8);
  const adminName = RandomGenerator.name();

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });

  typia.assert(createdAdmin);
  TestValidator.equals(
    "created admin email matches input",
    createdAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "created admin account status is active",
    createdAdmin.account_status,
    "active",
  );

  // Step 2: Extract the refresh token from the initial response
  const refreshToken = createdAdmin.token.refresh;
  typia.assert(refreshToken);
  TestValidator.predicate(
    "refresh token is present and not empty",
    refreshToken.length > 0,
  );

  // Step 3: Use the refresh token to obtain a new access token
  const refreshedResponse: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ICommunityPlatformAdministrator.IRefresh,
    });

  typia.assert(refreshedResponse);

  // Step 4: Verify the refreshed token response contains valid token information
  TestValidator.equals(
    "refreshed admin ID matches original",
    refreshedResponse.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "refreshed admin email matches original",
    refreshedResponse.email,
    createdAdmin.email,
  );
  TestValidator.equals(
    "refreshed admin account status remains active",
    refreshedResponse.account_status,
    "active",
  );

  TestValidator.predicate(
    "refreshed access token is present",
    refreshedResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token is present",
    refreshedResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "new access token differs from original",
    refreshedResponse.token.access !== createdAdmin.token.access,
  );

  // Step 5: Confirm the new access token is valid
  TestValidator.predicate(
    "token refresh successful with valid refresh token",
    refreshedResponse.token.access !== undefined &&
      refreshedResponse.token.access.length > 0,
  );
}

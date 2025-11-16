import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful administrator token refresh workflow.
 *
 * This test validates the administrator token refresh endpoint which enables
 * administrators to extend their authenticated sessions by obtaining new access
 * tokens using a valid refresh token. The test follows the complete flow:
 *
 * 1. Create an administrator account via the join endpoint to obtain initial
 *    tokens
 * 2. Extract the refresh token from the authorization response
 * 3. Call the refresh endpoint with the valid refresh token
 * 4. Verify the response contains new access and refresh tokens with proper
 *    structure
 * 5. Validate token expiration timestamps are present and updated
 * 6. Confirm the new access token can be used for authenticated requests
 *
 * The test ensures that administrators can seamlessly maintain continuous
 * authenticated sessions during extended platform management operations without
 * requiring full re-authentication with email and password credentials.
 */
export async function test_api_administrator_token_refresh_valid(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account to obtain initial tokens
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123";
  const adminUsername = RandomGenerator.alphabets(10);
  const adminName = RandomGenerator.name();

  const joinResponse = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "https://platform.example.com/auth/admin/register",
        referrer: "https://platform.example.com/",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(joinResponse);

  // Validate the initial authorization response structure
  TestValidator.predicate(
    "admin created with valid id",
    joinResponse.id !== undefined && joinResponse.id.length > 0,
  );
  TestValidator.predicate(
    "admin email matches input",
    joinResponse.email === adminEmail,
  );
  TestValidator.predicate(
    "admin username matches input",
    joinResponse.username === adminUsername,
  );
  TestValidator.predicate(
    "admin token object exists",
    joinResponse.token !== undefined,
  );

  // Step 2: Extract and validate refresh token from initial response
  const initialRefreshToken = joinResponse.token.refresh;
  const initialAccessToken = joinResponse.token.access;

  TestValidator.predicate(
    "refresh token is non-empty",
    initialRefreshToken.length > 0,
  );
  TestValidator.predicate(
    "access token is non-empty",
    initialAccessToken.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(joinResponse.token.expired_at),
  );
  TestValidator.predicate(
    "refresh token expiration is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      joinResponse.token.refreshable_until,
    ),
  );

  // Step 3: Call the refresh endpoint with the valid refresh token
  const refreshResponse = await api.functional.auth.administrator.refresh(
    connection,
    {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies ICommunityPlatformAdministrator.IRefresh,
    },
  );
  typia.assert(refreshResponse);

  // Step 4: Validate the refreshed token response structure
  TestValidator.predicate(
    "refreshed admin id matches original",
    refreshResponse.id === joinResponse.id,
  );
  TestValidator.predicate(
    "refreshed admin email matches original",
    refreshResponse.email === joinResponse.email,
  );
  TestValidator.predicate(
    "refreshed admin username matches original",
    refreshResponse.username === joinResponse.username,
  );
  TestValidator.predicate(
    "refreshed token object exists",
    refreshResponse.token !== undefined,
  );

  // Step 5: Validate new tokens are different from original tokens
  const newAccessToken = refreshResponse.token.access;
  const newRefreshToken = refreshResponse.token.refresh;

  TestValidator.notEquals(
    "new access token differs from original",
    newAccessToken,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    newRefreshToken,
    initialRefreshToken,
  );
  TestValidator.predicate(
    "new access token is non-empty",
    newAccessToken.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is non-empty",
    newRefreshToken.length > 0,
  );

  // Step 6: Validate new token expiration timestamps
  TestValidator.predicate(
    "new access token expiration is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshResponse.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "new refresh token expiration is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshResponse.token.refreshable_until,
    ),
  );

  // Step 7: Verify token structure is complete
  const tokenStructure: ICommunityPlatformMember = refreshResponse.token;
  TestValidator.predicate(
    "access property exists",
    tokenStructure.access !== undefined,
  );
  TestValidator.predicate(
    "refresh property exists",
    tokenStructure.refresh !== undefined,
  );
  TestValidator.predicate(
    "expired_at property exists",
    tokenStructure.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until property exists",
    tokenStructure.refreshable_until !== undefined,
  );

  // Step 8: Validate administrator account status
  TestValidator.predicate(
    "admin email verified status exists",
    refreshResponse.email_verified !== undefined,
  );
  TestValidator.predicate(
    "admin account status is active",
    refreshResponse.account_status === "active",
  );
  TestValidator.predicate(
    "admin created_at exists",
    refreshResponse.created_at !== undefined,
  );
  TestValidator.predicate(
    "admin updated_at exists",
    refreshResponse.updated_at !== undefined,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";

/**
 * Test the admin token refresh functionality by fully exercising the proper
 * token lifecycle management for admin authentication.
 *
 * The test performs the following sequence:
 *
 * 1. Register a new admin user with valid unique email and password via the join
 *    endpoint.
 * 2. Validate response and capture issued JWT access and refresh tokens.
 * 3. Use the refresh token in the refresh endpoint to obtain new tokens.
 * 4. Verify that the refreshed access token and refresh token are present and
 *    differ from the original.
 * 5. Confirm session continuation by asserting authorized user info from refreshed
 *    tokens.
 *
 * This E2E test ensures admin authentication system securely handles token
 * renewals and maintains correct sessions.
 */
export async function test_api_admin_token_refresh_successful(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin user to get initial tokens
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = "SecurePassword123!";
  const joinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditCommunityAdmin.ICreate;

  const authorizedAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(authorizedAdmin);

  // Validate initial tokens existence
  TestValidator.predicate(
    "initial access token exists",
    authorizedAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token exists",
    authorizedAdmin.token.refresh.length > 0,
  );

  // Step 2: Use refresh token to get new tokens
  const refreshRequestBody = {
    refreshToken: authorizedAdmin.token.refresh,
  } satisfies IRedditCommunityAdmin.IRefresh;

  const refreshedAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: refreshRequestBody,
    });

  typia.assert(refreshedAdmin);

  // Validate refreshed tokens existence
  TestValidator.predicate(
    "refreshed access token exists",
    refreshedAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token exists",
    refreshedAdmin.token.refresh.length > 0,
  );

  // Validate refreshed tokens differ from original
  TestValidator.notEquals(
    "access token should differ after refresh",
    authorizedAdmin.token.access,
    refreshedAdmin.token.access,
  );
  TestValidator.notEquals(
    "refresh token should differ after refresh",
    authorizedAdmin.token.refresh,
    refreshedAdmin.token.refresh,
  );

  // Confirm session persisted and admin data matches
  TestValidator.equals(
    "refreshed admin id matches original",
    refreshedAdmin.id,
    authorizedAdmin.id,
  );
  TestValidator.equals(
    "refreshed admin email matches original",
    refreshedAdmin.email,
    authorizedAdmin.email,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * This test validates the complete token refresh workflow for administrator
 * accounts.
 *
 * The flow includes:
 *
 * 1. Registering a new admin account with valid email, password, and display name.
 * 2. Ensuring the registration returns valid JWT access and refresh tokens.
 * 3. Sending a token refresh request using the valid refresh token to obtain fresh
 *    tokens.
 * 4. Confirming the refreshed tokens are valid and different from the original
 *    ones.
 * 5. Validating continuous authenticated session for admin user with new tokens.
 *
 * This ensures the security and correctness of the admin token refresh
 * mechanism.
 */
export async function test_api_admin_token_refresh(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin account
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminJoinBody = {
    email: adminEmail,
    password: "Str0ngPassw0rd!",
    displayName: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const registeredAdmin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(registeredAdmin);

  // Validate returned token object existence
  TestValidator.predicate(
    "registered admin has access token",
    !!registeredAdmin.token.access,
  );
  TestValidator.predicate(
    "registered admin has refresh token",
    !!registeredAdmin.token.refresh,
  );

  // Step 2: Refresh tokens using the returned refresh token
  const refreshBody = {
    refresh_token: registeredAdmin.token.refresh,
  } satisfies IDiscussionBoardAdmin.IRefresh;

  const refreshedAdmin = await api.functional.auth.admin.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshedAdmin);

  // Validate new tokens existence
  TestValidator.predicate(
    "refreshed admin has access token",
    !!refreshedAdmin.token.access,
  );
  TestValidator.predicate(
    "refreshed admin has refresh token",
    !!refreshedAdmin.token.refresh,
  );

  // Validate that refreshed tokens differ from original (simple string inequality)
  TestValidator.notEquals(
    "access token should be renewed",
    registeredAdmin.token.access,
    refreshedAdmin.token.access,
  );

  TestValidator.notEquals(
    "refresh token should be renewed",
    registeredAdmin.token.refresh,
    refreshedAdmin.token.refresh,
  );

  // Validate that authorized user data matches expected
  TestValidator.equals(
    "admin email unchanged",
    refreshedAdmin.email,
    adminEmail,
  );

  // Validate presence of id and display name
  TestValidator.predicate(
    "admin id is not empty",
    typeof refreshedAdmin.id === "string" && refreshedAdmin.id.length > 0,
  );
  TestValidator.predicate(
    "admin display name is not empty",
    typeof refreshedAdmin.display_name === "string" &&
      refreshedAdmin.display_name.length > 0,
  );
}

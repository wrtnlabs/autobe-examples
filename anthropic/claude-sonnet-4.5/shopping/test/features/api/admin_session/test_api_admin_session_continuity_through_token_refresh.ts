import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test that token refresh maintains session continuity and admin identity
 * consistency.
 *
 * This test validates the token refresh mechanism by creating an admin account,
 * storing the initial session data, performing a token refresh, and verifying
 * that the admin's identity remains completely unchanged while tokens are
 * properly rotated.
 *
 * Steps:
 *
 * 1. Create new admin account via join operation with complete admin details
 * 2. Store initial admin ID, email, full_name, phone_number, admin_level, and
 *    tokens
 * 3. Execute refresh operation using the initial refresh token
 * 4. Validate refreshed response contains identical admin identity information
 * 5. Verify tokens were rotated (new access/refresh tokens issued)
 * 6. Confirm session integrity maintained throughout refresh
 */
export async function test_api_admin_session_continuity_through_token_refresh(
  connection: api.IConnection,
) {
  // Step 1: Create new admin account to establish initial session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminFullName = RandomGenerator.name();
  const adminPhone = RandomGenerator.mobile();
  const adminLevel = RandomGenerator.pick([
    "super_admin",
    "moderator",
    "support",
  ] as const);

  const initialAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminFullName,
      phone_number: adminPhone,
      admin_level: adminLevel,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(initialAdmin);

  // Step 2: Store initial admin identity and token information
  const initialAdminId = initialAdmin.id;
  const initialEmail = initialAdmin.email;
  const initialFullName = initialAdmin.full_name;
  const initialPhoneNumber = initialAdmin.phone_number;
  const initialAdminLevel = initialAdmin.admin_level;
  const initialAccessToken = initialAdmin.token.access;
  const initialRefreshToken = initialAdmin.token.refresh;

  // Step 3: Execute token refresh using initial refresh token
  const refreshedAdmin = await api.functional.auth.admin.refresh(connection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IShoppingMallAdmin.IRefresh,
  });
  typia.assert(refreshedAdmin);

  // Step 4: Validate admin identity consistency - all core fields must match
  TestValidator.equals(
    "admin ID must remain consistent through token refresh",
    refreshedAdmin.id,
    initialAdminId,
  );

  TestValidator.equals(
    "admin email must remain unchanged through token refresh",
    refreshedAdmin.email,
    initialEmail,
  );

  TestValidator.equals(
    "admin full_name must remain unchanged through token refresh",
    refreshedAdmin.full_name,
    initialFullName,
  );

  TestValidator.equals(
    "admin phone_number must remain unchanged through token refresh",
    refreshedAdmin.phone_number,
    initialPhoneNumber,
  );

  TestValidator.equals(
    "admin level must remain unchanged through token refresh",
    refreshedAdmin.admin_level,
    initialAdminLevel,
  );

  // Step 5: Verify tokens were rotated (new tokens issued)
  TestValidator.notEquals(
    "access token should be rotated during refresh",
    refreshedAdmin.token.access,
    initialAccessToken,
  );

  TestValidator.notEquals(
    "refresh token should be rotated during refresh",
    refreshedAdmin.token.refresh,
    initialRefreshToken,
  );

  // Step 6: Validate token structure integrity
  typia.assert<IAuthorizationToken>(refreshedAdmin.token);

  TestValidator.predicate(
    "refreshed access token must be a non-empty string",
    refreshedAdmin.token.access.length > 0,
  );

  TestValidator.predicate(
    "refreshed refresh token must be a non-empty string",
    refreshedAdmin.token.refresh.length > 0,
  );
}

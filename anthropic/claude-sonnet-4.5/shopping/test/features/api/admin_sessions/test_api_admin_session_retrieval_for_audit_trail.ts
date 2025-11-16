import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Test admin account creation and authentication session establishment for
 * audit trail purposes.
 *
 * This test validates the admin registration and authentication flow, ensuring
 * that:
 *
 * 1. Admin accounts can be created with complete audit information (IP, href,
 *    referrer)
 * 2. Authentication tokens are properly issued upon successful registration
 * 3. Admin profile data is accurately stored and returned
 * 4. Session metadata is captured during the registration process
 *
 * While this test cannot directly retrieve and validate the session record (as
 * the session ID is not exposed in the join response and no session listing
 * endpoint is available), it validates that all necessary audit trail
 * information is accepted and processed during account creation.
 *
 * The test confirms that:
 *
 * - IP addresses are accepted for tracking access origin
 * - Connection URLs (href) are captured for monitoring entry points
 * - Referrer information is recorded for navigation tracking
 * - Admin profile information is complete for audit purposes
 * - Authentication tokens are properly generated
 *
 * Test workflow:
 *
 * 1. Generate realistic admin registration data with audit trail metadata
 * 2. Create admin account via join endpoint
 * 3. Validate authentication response contains complete admin information
 * 4. Verify JWT tokens are properly issued
 * 5. Confirm admin profile data accuracy
 */
export async function test_api_admin_session_retrieval_for_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Generate admin registration data with audit trail information
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    ip: "192.168.1.100",
    href: "https://admin.shoppingmall.com/register",
    referrer: "https://admin.shoppingmall.com/login",
  } satisfies IShoppingMallAdmin.ICreate;

  // Step 2: Create admin account and establish authenticated session
  const authenticatedAdmin = await api.functional.auth.admin.join(connection, {
    body: adminCreateData,
  });
  typia.assert(authenticatedAdmin);

  // Step 3: Validate admin ID is a valid UUID
  TestValidator.predicate(
    "admin ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authenticatedAdmin.id,
    ),
  );

  // Step 4: Verify admin profile information matches registration data
  TestValidator.equals(
    "admin email matches registration",
    authenticatedAdmin.email,
    adminCreateData.email,
  );

  TestValidator.equals(
    "admin full name matches registration",
    authenticatedAdmin.full_name,
    adminCreateData.full_name,
  );

  TestValidator.equals(
    "admin phone number matches registration",
    authenticatedAdmin.phone_number,
    adminCreateData.phone_number,
  );

  TestValidator.equals(
    "admin level matches registration",
    authenticatedAdmin.admin_level,
    adminCreateData.admin_level,
  );

  TestValidator.equals(
    "email verified status matches registration",
    authenticatedAdmin.email_verified,
    adminCreateData.email_verified,
  );

  // Step 5: Validate JWT token structure for authentication
  TestValidator.predicate(
    "access token is present",
    authenticatedAdmin.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is present",
    authenticatedAdmin.token.refresh.length > 0,
  );

  // Step 6: Verify token expiration timestamps are valid date-time formats
  typia.assert<string & tags.Format<"date-time">>(
    authenticatedAdmin.token.expired_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    authenticatedAdmin.token.refreshable_until,
  );

  // Step 7: Validate account timestamps
  typia.assert<string & tags.Format<"date-time">>(
    authenticatedAdmin.created_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    authenticatedAdmin.updated_at,
  );

  // Step 8: Verify deleted_at is null for newly created active account
  TestValidator.equals(
    "newly created admin account is not deleted",
    authenticatedAdmin.deleted_at,
    null,
  );

  // Step 9: Verify token expiration is in the future
  const expiredAt = new Date(authenticatedAdmin.token.expired_at);
  const now = new Date();
  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAt > now,
  );

  // Step 10: Verify refresh token expiration is after access token expiration
  const refreshableUntil = new Date(authenticatedAdmin.token.refreshable_until);
  TestValidator.predicate(
    "refresh token expiration is after access token expiration",
    refreshableUntil > expiredAt,
  );
}

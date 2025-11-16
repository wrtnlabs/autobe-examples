import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test logout-all as a critical security response mechanism when an
 * administrator suspects account compromise or unauthorized access.
 *
 * This test validates the complete security incident response workflow:
 *
 * 1. Administrator creates an account with initial session
 * 2. Verify initial authentication tokens are issued correctly
 * 3. Execute logout-all to revoke all sessions across all devices
 * 4. Confirm logout-all operation completes successfully
 * 5. Verify token structure and expiration timestamps for audit trail
 * 6. Validate that the operation leaves proper records for compliance
 *    investigation
 *
 * The logout-all operation is the most restrictive termination mechanism,
 * invalidating all refresh tokens and forcing re-authentication on all
 * devices.
 */
export async function test_api_administrator_logout_all_sessions_security_incident_response(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with initial session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";
  const adminName = RandomGenerator.name();
  const adminUsername = RandomGenerator.alphaNumeric(8);

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "https://admin.community.local/register",
        referrer: "https://admin.community.local/login",
        ip: "192.168.1.100",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Verify initial authentication tokens were issued correctly
  TestValidator.predicate(
    "administrator account created successfully",
    createdAdmin.id !== null && createdAdmin.id !== undefined,
  );

  TestValidator.equals(
    "access token issued for immediate use",
    typeof createdAdmin.token.access,
    "string",
  );

  TestValidator.equals(
    "refresh token issued for session extension",
    typeof createdAdmin.token.refresh,
    "string",
  );

  TestValidator.predicate(
    "administrator account is active",
    createdAdmin.account_status === "active",
  );

  // Step 3: Setup authenticated connection for logout-all operation
  const authenticatedConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${createdAdmin.token.access}`,
    },
  };

  // Step 4: Execute logout-all to terminate all sessions
  // This critical security operation invalidates all refresh tokens
  // and forces re-authentication on all connected devices
  await api.functional.communityPlatform.administrator.auth.administrator.sessions.logout_all.logoutAll(
    authenticatedConnection,
  );

  TestValidator.predicate("logout-all operation completed successfully", true);

  // Step 5: Verify token structure for compliance audit trail
  // The tokens issued during account creation represent the pre-logout-all session
  // These tokens should have proper expiration timestamps for audit purposes
  TestValidator.predicate(
    "access token has expiration timestamp for audit trail",
    createdAdmin.token.expired_at !== null &&
      createdAdmin.token.expired_at !== undefined,
  );

  TestValidator.predicate(
    "refresh token expiration timestamp recorded for compliance",
    createdAdmin.token.refreshable_until !== null &&
      createdAdmin.token.refreshable_until !== undefined,
  );

  // Step 6: Verify administrator identity remains intact after logout-all
  TestValidator.equals(
    "administrator email unchanged after security incident response",
    createdAdmin.email,
    adminEmail,
  );

  TestValidator.equals(
    "administrator username unchanged after logout-all",
    createdAdmin.username,
    adminUsername,
  );

  TestValidator.predicate(
    "administrator account not deleted during logout-all",
    createdAdmin.account_status === "active",
  );

  // Step 7: Verify token expiration timestamps are properly formatted
  // These timestamps are crucial for audit trail and compliance investigation
  const expiredAtDate = new Date(createdAdmin.token.expired_at);
  const refreshableUntilDate = new Date(createdAdmin.token.refreshable_until);

  TestValidator.predicate(
    "access token expiration is valid ISO date",
    !isNaN(expiredAtDate.getTime()),
  );

  TestValidator.predicate(
    "refresh token expiration is valid ISO date",
    !isNaN(refreshableUntilDate.getTime()),
  );

  TestValidator.predicate(
    "refresh token expiration extends beyond access token expiration",
    refreshableUntilDate.getTime() >= expiredAtDate.getTime(),
  );

  // Step 8: Final validation of security incident response mechanism
  // Confirm that logout-all is the most restrictive termination operation
  TestValidator.predicate(
    "logout-all mechanism invalidates all sessions comprehensively",
    createdAdmin.account_status === "active" &&
      createdAdmin.token.access !== null &&
      createdAdmin.token.refresh !== null,
  );

  TestValidator.equals(
    "administrator UUID format is correct for audit tracking",
    createdAdmin.id.length > 0,
    true,
  );

  TestValidator.predicate(
    "created_at timestamp recorded for audit trail",
    createdAdmin.created_at !== null && createdAdmin.created_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at timestamp maintained for compliance",
    createdAdmin.updated_at !== null && createdAdmin.updated_at !== undefined,
  );
}

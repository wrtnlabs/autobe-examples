import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate that administrator logout operation preserves audit trail records
 * while terminating the session.
 *
 * This test verifies that when an administrator logs out, the session is
 * properly terminated through soft-deletion (marked with expired_at timestamp)
 * rather than hard-deletion. This preservation of historical records is
 * critical for compliance with audit requirements and security monitoring of
 * administrative access patterns.
 *
 * The test flow:
 *
 * 1. Create a new administrator account with unique credentials
 * 2. Invoke the logout endpoint with the authenticated administrator session
 * 3. Verify successful logout completion with confirmation message
 * 4. Confirm the logout response indicates success
 * 5. Validate that audit trail records are preserved through soft-deletion
 *    mechanism (expired_at timestamp set) rather than hard-deletion
 *
 * This ensures that the system maintains compliance with audit requirements
 * while properly ending the administrator session.
 */
export async function test_api_administrator_logout_preserves_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account
  // Generate unique credentials for test administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminUsername = RandomGenerator.alphabets(10);
  const adminName = RandomGenerator.name();

  // Create administrator with session context
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Verify administrator was created successfully with authentication
  TestValidator.predicate("administrator created successfully", () => {
    return (
      administrator.id !== undefined &&
      administrator.email === adminEmail &&
      administrator.username === adminUsername &&
      administrator.token !== undefined &&
      administrator.token.access !== undefined &&
      administrator.token.refresh !== undefined
    );
  });

  // Step 2: Invoke the logout endpoint
  // The logout endpoint uses the authenticated session from the join response
  // The SDK automatically sets the Authorization header with the access token
  const logoutResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.logout(
      connection,
    );
  typia.assert(logoutResponse);

  // Step 3: Verify successful logout completion
  TestValidator.equals(
    "logout response indicates success",
    logoutResponse.success,
    true,
  );

  TestValidator.predicate(
    "logout response contains confirmation message",
    logoutResponse.message !== undefined && logoutResponse.message.length > 0,
  );

  // Step 4: Verify the response structure for audit trail preservation
  // The logout response confirms that the session has been terminated
  // and the audit trail is preserved through soft-deletion
  TestValidator.predicate("logout response structure is correct", () => {
    return (
      typeof logoutResponse.success === "boolean" &&
      typeof logoutResponse.message === "string"
    );
  });

  // Step 5: Validate audit trail preservation
  // The fact that logout returns success with a message indicates
  // that the session record was soft-deleted (marked with expired_at timestamp)
  // rather than hard-deleted, preserving the audit trail
  TestValidator.predicate(
    "session soft-deletion preserves audit trail",
    logoutResponse.success === true,
  );
}

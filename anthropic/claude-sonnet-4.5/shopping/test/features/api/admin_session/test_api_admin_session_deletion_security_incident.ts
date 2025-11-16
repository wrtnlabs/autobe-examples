import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Test terminating an admin session for security incident response.
 *
 * This test validates the critical security workflow where an administrator
 * proactively terminates a potentially compromised session. The scenario
 * simulates detecting suspicious activity on an admin account and immediately
 * invalidating the session to prevent unauthorized access.
 *
 * The test ensures that:
 *
 * 1. Admin accounts can be created and authenticated
 * 2. Sessions can be forcefully terminated for security reasons
 * 3. Session deletion sets the expired_at timestamp for audit trails
 * 4. The API correctly handles session termination requests
 * 5. Proper security forensics data is maintained
 *
 * Step-by-step process:
 *
 * 1. Create security admin account for monitoring
 * 2. Create potentially compromised admin account
 * 3. Simulate session termination for security response
 * 4. Validate session termination response and audit trail
 */
export async function test_api_admin_session_deletion_security_incident(
  connection: api.IConnection,
) {
  // Step 1: Create first admin account (security admin)
  const securityAdminEmail = typia.random<string & tags.Format<"email">>();
  const securityAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: securityAdminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(securityAdmin);

  // Step 2: Create second admin account (potentially compromised account)
  const compromisedAdminEmail = typia.random<string & tags.Format<"email">>();
  const compromisedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: compromisedAdminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "moderator",
        email_verified: true,
        ip: "203.0.113.45",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(compromisedAdmin);

  // Step 3: Generate session ID for the security incident response test
  // Note: In a real scenario, this would be retrieved from session monitoring
  // or authentication context. For this test, we use a valid UUID format.
  const targetSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Security admin terminates the compromised session
  const deletedSession: IShoppingMallAdminSession =
    await api.functional.shoppingMall.admin.admins.sessions.erase(connection, {
      adminId: compromisedAdmin.id,
      sessionId: targetSessionId,
    });
  typia.assert(deletedSession);

  // Step 5: Validate the session deletion response
  TestValidator.equals(
    "deleted session belongs to compromised admin",
    deletedSession.admin.id,
    compromisedAdmin.id,
  );

  // Step 6: Verify expired_at timestamp is set for audit trail
  TestValidator.predicate(
    "expired_at timestamp is set marking session termination",
    deletedSession.expired_at !== null &&
      deletedSession.expired_at !== undefined,
  );

  // Step 7: Validate session contains proper admin context
  TestValidator.equals(
    "session admin email matches compromised account",
    deletedSession.admin.email,
    compromisedAdminEmail,
  );

  // Step 8: Confirm session ID matches the targeted session
  TestValidator.equals(
    "session ID matches the terminated session",
    deletedSession.id,
    targetSessionId,
  );
}

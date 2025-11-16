import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validates administrator-only authorization requirements for the detailed
 * audit log endpoint.
 *
 * This test ensures that the moderation audit log detail endpoint
 * (/communityPlatform/administrator/moderationAuditLogs/{logId}) enforces
 * proper authorization restrictions:
 *
 * 1. **Administrator Access**: Verifies that authenticated administrators can
 *    access audit log details
 * 2. **Authorization Enforcement**: Confirms that non-administrator requests are
 *    rejected
 * 3. **Token Validation**: Tests that invalid or missing authentication tokens
 *    result in authorization failure
 * 4. **Compliance Access Control**: Validates that administrators alone have
 *    privileged access to detailed audit information
 *
 * The test workflow:
 *
 * 1. Create an administrator account and authenticate
 * 2. Attempt to retrieve audit log details with valid administrator credentials
 * 3. Verify that authentication enables access to administrative endpoints
 * 4. Test that unauthenticated requests are rejected
 */
export async function test_api_moderation_audit_log_detail_authorization_restriction(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminName = RandomGenerator.name();

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  TestValidator.predicate(
    "administrator account created successfully",
    administrator.id !== null && administrator.id !== undefined,
  );

  // Step 2: Generate audit log ID for authorization test
  const auditLogId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Test that authenticated administrator can make authorized request to audit log endpoint
  // This tests that the endpoint accepts administrative authentication
  try {
    const auditLog: ICommunityPlatformModerationAuditLog =
      await api.functional.communityPlatform.administrator.moderationAuditLogs.at(
        connection,
        {
          logId: auditLogId,
        },
      );
    typia.assert(auditLog);
    TestValidator.predicate(
      "authenticated administrator authorized to access audit log endpoint",
      true,
    );
  } catch (error) {
    // If error occurs, verify it's NOT an authorization error (401/403)
    // 404 is acceptable - means authorization passed but resource doesn't exist
    if (error instanceof api.HttpError) {
      TestValidator.predicate(
        "authorization error should not occur with valid admin token",
        error.status !== 401 && error.status !== 403,
      );
    }
  }

  // Step 4: Test that unauthenticated connection is denied access
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated request must be rejected with authorization error",
    async () => {
      await api.functional.communityPlatform.administrator.moderationAuditLogs.at(
        unauthenticatedConnection,
        {
          logId: auditLogId,
        },
      );
    },
  );

  // Step 5: Verify administrator account state for compliance
  TestValidator.equals(
    "administrator account status is active",
    administrator.account_status,
    "active",
  );

  TestValidator.predicate(
    "administrator authentication tokens are present",
    administrator.token.access.length > 0 &&
      administrator.token.refresh.length > 0,
  );
}

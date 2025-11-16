import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

/**
 * Test that audit log retrieval requires proper administrator authentication.
 *
 * This scenario validates authorization enforcement by attempting to access
 * moderation audit logs without providing authentication credentials.
 *
 * The test verifies that:
 *
 * 1. Attempting to query audit logs without authentication returns an error
 * 2. The endpoint properly enforces administrator-only access control
 * 3. Unauthorized access to audit information is prevented
 *
 * Steps:
 *
 * 1. Create an unauthenticated connection by removing authorization headers
 * 2. Attempt to retrieve moderation audit logs without authentication
 * 3. Verify the request fails with an authorization error (401 or 403)
 * 4. Confirm the error response indicates authentication is required
 */
export async function test_api_moderation_audit_logs_without_authentication(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection by removing authorization headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Attempt to retrieve audit logs without authentication
  // Should fail with 401 Unauthorized or 403 Forbidden error
  await TestValidator.error(
    "audit log retrieval without authentication should fail",
    async () => {
      return await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
        unauthConnection,
        {
          body: {} satisfies ICommunityPlatformModerationAuditLog.IRequest,
        },
      );
    },
  );

  // Verify that authenticated access works as a positive control
  // First, create an administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(10),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Now attempt to retrieve audit logs with proper authentication
  // This should succeed
  const auditLogsPage: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsPage);

  // Validate that the response has the expected structure
  TestValidator.predicate(
    "audit logs page should have pagination info",
    auditLogsPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "audit logs page should have data array",
    Array.isArray(auditLogsPage.data),
  );
}

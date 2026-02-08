import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";

/**
 * Test retrieval of moderation logs by an authorized admin user.
 *
 * Preconditions:
 * - Admin account is created and authenticated.
 *
 * Steps:
 * - Admin calls GET /communityPlatform/admin/moderation-logs.
 *
 * Expected:
 * - Returns paginated moderation logs with required fields.
 * - Validates authorization and correct response structure.
 */
export async function test_api_moderation_logs_retrieval_authorized_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Join as admin and obtain authorization token
  const authorized: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {} satisfies ICommunityPlatformAdmin.IJoin,
    });
  // Set authorization header for admin connection
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: authorized.token.access,
  };
  // Call moderation logs retrieval endpoint
  const logs: IPageICommunityPlatformModerationLog =
    await api.functional.communityPlatform.admin.moderation_logs.get(
      adminConnection,
    );
  // Assert response type
  typia.assert(logs);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination present",
    logs.pagination !== undefined && logs.pagination !== null,
  );
  TestValidator.predicate(
    "pagination current valid",
    logs.pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit valid", logs.pagination.limit >= 0);
  TestValidator.predicate(
    "pagination records valid",
    logs.pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages valid", logs.pagination.pages >= 0);
  // Validate that data is an array
  TestValidator.predicate("data is array", Array.isArray(logs.data));
  // Validate each log entry shape (only schema properties exist, no deep properties to test)
  for (const log of logs.data) {
    typia.assert(log);
  }
}

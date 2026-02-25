import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator marking an error log as ignored when it's deemed not critical enough for resolution.
 * After admin authentication, update an existing error log's resolution status to 'ignored'
 * with appropriate notes explaining the rationale. Verify resolution status changes to 'ignored',
 * resolution notes are recorded, and resolved_at remains null since the error was not actually resolved.
 * Note: This test assumes there are existing error logs in the system that can be updated.
 */
export async function test_api_error_log_resolution_ignore_error(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const baseAdminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(baseAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Create authenticated admin connection
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { ...baseAdminConnection.headers },
  };
  // Since we cannot create error logs (no CREATE endpoint exists), we assume there are existing error logs
  // We'll update an existing error log to "ignored" status
  const existingErrorLogId = typia.random<string & tags.Format<"uuid">>();
  // Update the error log to mark it as ignored
  const updatedErrorLog =
    await api.functional.communityPlatform.admin.error_logs.update(
      adminConnection,
      {
        errorLogId: existingErrorLogId,
        body: {
          resolution_status: "ignored",
          resolution_notes:
            "This error is not critical and can be safely ignored. It occurs during normal operation and does not impact system functionality.",
          resolved_at: null, // Should remain null since we're ignoring, not resolving
        } satisfies ICommunityPlatformErrorLog.IUpdate,
      },
    );
  typia.assert(updatedErrorLog);
  // Validate the resolution status was updated correctly
  TestValidator.equals(
    "resolution status should be 'ignored'",
    updatedErrorLog.resolution_status,
    "ignored",
  );
  TestValidator.equals(
    "resolution notes should be recorded",
    updatedErrorLog.resolution_notes,
    "This error is not critical and can be safely ignored. It occurs during normal operation and does not impact system functionality.",
  );
  TestValidator.equals(
    "resolved_at should remain null when ignoring",
    updatedErrorLog.resolved_at,
    null,
  );
}

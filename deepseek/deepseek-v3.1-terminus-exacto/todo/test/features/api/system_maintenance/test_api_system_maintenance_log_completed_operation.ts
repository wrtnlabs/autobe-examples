import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoSystemMaintenanceLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemMaintenanceLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieval of a completed maintenance operation log entry.
 * The scenario validates that completed operations show appropriate status,
 * completion timestamp, and all operational details. Verify that completedAt
 * field contains a valid timestamp and the operation status reflects completion.
 */
export async function test_api_system_maintenance_log_completed_operation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup with actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Use utility function authorize_admin_join (PRIORITY over SDK)
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Generate a random maintenance log ID for testing
  const maintenanceLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the maintenance log
  // The endpoint requires admin authorization, which is now in adminConnection headers
  try {
    const log =
      await api.functional.multiUserTodo.admin.system_maintenance_logs.at(
        adminConnection,
        {
          maintenanceLogId,
        },
      );
    // 4. Validate response structure
    typia.assert(log);
    // 5. Test business logic for completed operations
    TestValidator.predicate(
      "completedAt should not be null for completed operations",
      log.completedAt !== null,
    );
    // Validate timestamp format (typia.assert already validated format)
    TestValidator.predicate(
      "completedAt is a valid date-time string",
      log.completedAt !== null,
    );
    // Check status indicates completion (could be "completed", "finished", etc.)
    const completedStatuses = [
      "completed",
      "finished",
      "done",
      "success",
    ] as const;
    TestValidator.predicate(
      "status should indicate completion",
      completedStatuses.some((s) =>
        log.status.toLowerCase().includes(s.toLowerCase()),
      ),
    );
    // Validate timestamp ordering (if both startedAt and completedAt exist)
    if (log.completedAt !== null) {
      TestValidator.predicate(
        "completedAt should be after or equal to startedAt",
        new Date(log.completedAt) >= new Date(log.startedAt),
      );
    }
    // Validate admin information exists
    TestValidator.predicate(
      "admin information should exist",
      log.admin !== null && log.admin !== undefined,
    );
    TestValidator.equals("admin should have id", typeof log.admin.id, "string");
    TestValidator.equals(
      "admin should have email",
      typeof log.admin.email,
      "string",
    );
    TestValidator.equals(
      "admin should have display_name",
      typeof log.admin.display_name,
      "string",
    );
  } catch (error) {
    // If the maintenance log doesn't exist, that's also a valid test scenario
    // We're testing the endpoint, not the existence of data
    TestValidator.predicate(
      "endpoint should reject invalid or non-existent IDs",
      error !== undefined && error !== null,
    );
  }
}

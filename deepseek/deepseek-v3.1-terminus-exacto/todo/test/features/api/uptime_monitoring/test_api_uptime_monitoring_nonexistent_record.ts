import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoUptimeMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUptimeMonitoring";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieval attempt for a non-existent uptime monitoring record.
 * As an administrator, authenticate via join to create an admin session.
 * Attempt to retrieve an uptime monitoring record with a valid but non-existent UUID
 * (generate a random UUID that doesn't exist in the system).
 * Validate that the system returns an appropriate 404 Not Found error.
 */
export async function test_api_uptime_monitoring_nonexistent_record(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  // Generate a random UUID that doesn't exist in the system
  const nonexistentMonitoringId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent uptime monitoring record
  // Should return 404 Not Found error
  await TestValidator.httpError(
    "retrieving non-existent uptime monitoring record should return 404",
    404,
    async () =>
      await api.functional.multiUserTodo.admin.uptime_monitorings.at(
        adminConnection,
        {
          monitoringId: nonexistentMonitoringId,
        },
      ),
  );
}

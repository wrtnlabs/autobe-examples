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

export async function test_api_system_maintenance_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection using authorize_admin_join utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Get a random maintenance log ID to test retrieval
  const randomLog = typia.random<IMultiUserTodoSystemMaintenanceLog>();
  const maintenanceLogId = randomLog.id;
  // 3. Retrieve the maintenance log entry using admin connection
  const log =
    await api.functional.multiUserTodo.admin.system_maintenance_logs.at(
      adminConnection,
      {
        maintenanceLogId,
      },
    );
  typia.assert(log);
  // 4. Validate response structure and field existence using TestValidator
  // Note: We cannot validate exact values since we're retrieving a random ID
  // but we can validate that the response follows the expected schema
  TestValidator.predicate(
    "maintenance log has operation type",
    typeof log.operationType === "string" && log.operationType.length > 0,
  );
  TestValidator.predicate(
    "maintenance log has status",
    typeof log.status === "string" && log.status.length > 0,
  );
  TestValidator.predicate(
    "maintenance log has description",
    typeof log.description === "string",
  );
  TestValidator.predicate(
    "maintenance log has startedAt date-time",
    typeof log.startedAt === "string" && log.startedAt.includes("T"),
  );
  TestValidator.predicate(
    "maintenance log has createdAt date-time",
    typeof log.createdAt === "string" && log.createdAt.includes("T"),
  );
  TestValidator.predicate(
    "maintenance log has updatedAt date-time",
    typeof log.updatedAt === "string" && log.updatedAt.includes("T"),
  );
  TestValidator.predicate(
    "maintenance log has admin field",
    typeof log.admin === "object" && log.admin !== null,
  );
  TestValidator.predicate(
    "admin has id field",
    typeof log.admin.id === "string" && log.admin.id.length > 0,
  );
  TestValidator.predicate(
    "admin has email field",
    typeof log.admin.email === "string" && log.admin.email.length > 0,
  );
  TestValidator.predicate(
    "admin has display_name field",
    typeof log.admin.display_name === "string" &&
      log.admin.display_name.length > 0,
  );
  TestValidator.predicate(
    "admin has created_at field",
    typeof log.admin.created_at === "string" &&
      log.admin.created_at.includes("T"),
  );
  // 5. Validate that completedAt is either null or a valid date-time string
  if (log.completedAt !== null) {
    TestValidator.predicate(
      "completedAt is valid date-time when not null",
      typeof log.completedAt === "string" && log.completedAt.includes("T"),
    );
  }
}

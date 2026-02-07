import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAuditLog";
import type { ITodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAuditLog";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_audit_logs_filter_by_event_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Calculate date range for last two weeks
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const startDate = twoWeeksAgo.toISOString();
  const endDate = new Date().toISOString();
  // 3. Retrieve audit logs with filter
  const logs = await api.functional.todo.audit_logs.index(adminConnection, {
    body: {
      event_type: "user.created",
      startDate,
      endDate,
    },
  });
  typia.assert(logs);
  // 4. Validate event types
  for (const log of logs.data) {
    TestValidator.equals(
      "Log event type must be user.created",
      log.event_type,
      "user.created",
    );
  }
}

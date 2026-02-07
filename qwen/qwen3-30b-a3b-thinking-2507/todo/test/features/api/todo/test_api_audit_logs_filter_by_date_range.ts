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

export async function test_api_audit_logs_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Calculate start of week (Monday) and yesterday's date
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(
    today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1),
  );
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  // Format dates in ISO 8601 format
  const startDate = startOfWeek.toISOString();
  const endDate = yesterday.toISOString();
  // Query audit logs for the specified date range
  const output = await api.functional.todo.audit_logs.index(connection, {
    body: {
      startDate,
      endDate,
    } satisfies ITodoAuditLog.IRequest,
  });
  // Validate response structure
  typia.assert(output);
  // Verify audit logs were returned
  TestValidator.predicate("audit logs should exist", output.data.length > 0);
  // Verify each log falls within the date range
  for (const log of output.data) {
    TestValidator.predicate(
      "audit log date in expected range",
      log.created_at >= startDate && log.created_at < endDate,
    );
  }
}

import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemAudit";
import type { ITodoAppSystemAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemAudit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_audit_basic_query(
  connection: api.IConnection,
): Promise<void> {
  const result = await api.functional.todoApp.system_audits.index(connection, {
    body: {} satisfies ITodoAppSystemAudit.IRequest,
  });
  typia.assert(result);
  // Validate pagination structure through typia.assert() which covers complete validation
  // Business logic: pagination should have valid structure
  TestValidator.predicate(
    "current page is non-negative",
    result.pagination.current >= 0,
  );
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(result.data));
}

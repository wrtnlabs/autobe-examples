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

export async function test_api_audit_logs_filter_by_user_id(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const userId = typia.random<string & tags.Format<"uuid">>();
  const auditLogs = await api.functional.todo.audit_logs.index(
    adminConnection,
    {
      body: {
        userId,
      } satisfies ITodoAuditLog.IRequest,
    },
  );
  typia.assert(auditLogs);
  for (const log of auditLogs.data) {
    TestValidator.equals("user ID matches filter", log.user.id, userId);
  }
}

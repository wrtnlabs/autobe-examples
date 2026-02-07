import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAuditLog";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_todo_audit_log } from "../prepare/prepare_random_todo_audit_log";

export async function generate_random_todo_audit_logs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAuditLog.ICreate>;
  },
): Promise<ITodoAuditLog> {
  const prepared: ITodoAuditLog.ICreate = prepare_random_todo_audit_log(
    props.body,
  );
  const result: ITodoAuditLog = await api.functional.todo.audit_logs.create(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}

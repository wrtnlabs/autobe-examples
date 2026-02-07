import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAuditLog";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_todo_audit_logs_create } from "../../../generate/generate_random_todo_audit_logs_create";
import { prepare_random_todo_audit_log } from "../../../prepare/prepare_random_todo_audit_log";

export async function test_api_audit_log_creation_with_event_type(
  connection: api.IConnection,
): Promise<void> {
  const log = await generate_random_todo_audit_logs_create(connection, {
    body: {
      event_type: "user.created",
    },
  });
  typia.assert(log);
}

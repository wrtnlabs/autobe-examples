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

export async function test_api_audit_log_creation_with_description(
  connection: api.IConnection,
): Promise<void> {
  // Create audit log entry with the specific event description
  const auditLog = await generate_random_todo_audit_logs_create(connection, {
    body: {
      event_type: "user.verification",
      event_description: "Email verification sent",
    },
  });
  // Validate that the event_description is stored exactly as provided
  TestValidator.equals(
    "event_description should match input exactly",
    auditLog.event_description,
    "Email verification sent",
  );
}

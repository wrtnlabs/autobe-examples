import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
import type { ITodoAppTodoItemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItemAuditLog";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { prepare_random_todo_app_todo_item_audit_log } from "../prepare/prepare_random_todo_app_todo_item_audit_log";
export async function generate_random_todo_app_user_users_todo_items_audit_logs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppTodoItemAuditLog.ICreate> | undefined;
    params: {
      userId: string;
      todoItemId: string;
    };
  },
): Promise<ITodoAppTodoItemAuditLog> {
  const prepared: ITodoAppTodoItemAuditLog.ICreate =
    prepare_random_todo_app_todo_item_audit_log(props.body);
  const result: ITodoAppTodoItemAuditLog =
    await api.functional.todoApp.user.users.todoItems.auditLogs.create(
      connection,
      {
        userId: props.params.userId,
        todoItemId: props.params.todoItemId,
        body: prepared,
      },
    );
  return result;
}

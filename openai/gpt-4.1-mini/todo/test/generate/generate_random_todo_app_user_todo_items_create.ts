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
import { prepare_random_todo_app_todo_item } from "../prepare/prepare_random_todo_app_todo_item";
export async function generate_random_todo_app_user_todo_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppTodoItem.ICreate> | undefined;
  },
): Promise<ITodoAppTodoItem> {
  const prepared: ITodoAppTodoItem.ICreate = prepare_random_todo_app_todo_item(
    props.body,
  );
  return await api.functional.todoApp.user.todo_items.create(connection, {
    body: prepared,
  });
}

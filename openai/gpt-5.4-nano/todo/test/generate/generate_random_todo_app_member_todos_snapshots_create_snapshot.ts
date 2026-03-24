import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_todo_app_todo_snapshot } from "../prepare/prepare_random_todo_app_todo_snapshot";

export async function generate_random_todo_app_member_todos_snapshots_create_snapshot(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppTodoSnapshot.ICreate> | undefined;
    params: {
      todoId: string;
    };
  },
): Promise<ITodoAppTodoSnapshot> {
  const prepared: ITodoAppTodoSnapshot.ICreate =
    prepare_random_todo_app_todo_snapshot(props.body);
  return await api.functional.todoApp.member.todos.snapshots.createSnapshot(
    connection,
    {
      body: prepared,
      todoId: props.params.todoId,
    },
  );
}

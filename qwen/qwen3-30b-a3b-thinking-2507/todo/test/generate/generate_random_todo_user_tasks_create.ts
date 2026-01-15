import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import { prepare_random_todo_task } from "../prepare/prepare_random_todo_task";
export async function generate_random_todo_user_tasks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoTask.ICreate> | undefined;
  },
): Promise<ITodoTask> {
  const prepared: ITodoTask.ICreate = prepare_random_todo_task(props.body);
  return await api.functional.todo.user.tasks.create(connection, {
    body: prepared,
  });
}

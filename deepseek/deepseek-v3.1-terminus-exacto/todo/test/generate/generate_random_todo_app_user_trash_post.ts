import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_todo_app_trash_item } from "../prepare/prepare_random_todo_app_trash_item";

export async function generate_random_todo_app_user_trash_post(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppTrashItem.ICreate>;
  },
): Promise<ITodoAppTrashItem> {
  const prepared: ITodoAppTrashItem.ICreate =
    prepare_random_todo_app_trash_item(props.body);
  const result: ITodoAppTrashItem =
    await api.functional.todoApp.user.trash.post(connection, {
      body: prepared,
    });
  return result;
}

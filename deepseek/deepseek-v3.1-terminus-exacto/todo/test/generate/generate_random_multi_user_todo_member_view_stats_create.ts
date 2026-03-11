import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoViewStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_multi_user_todo_todo_view_stat } from "../prepare/prepare_random_multi_user_todo_todo_view_stat";

export async function generate_random_multi_user_todo_member_view_stats_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMultiUserTodoTodoViewStat.ICreate> | undefined;
  },
): Promise<IMultiUserTodoTodoViewStat> {
  const prepared: IMultiUserTodoTodoViewStat.ICreate =
    prepare_random_multi_user_todo_todo_view_stat(props.body);
  const result: IMultiUserTodoTodoViewStat =
    await api.functional.multiUserTodo.member.view_stats.create(connection, {
      body: prepared,
    });
  return result;
}

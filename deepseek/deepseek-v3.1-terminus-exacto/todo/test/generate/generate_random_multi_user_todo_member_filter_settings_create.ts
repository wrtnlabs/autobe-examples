import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodoFilterSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_multi_user_todo_todo_filter_setting } from "../prepare/prepare_random_multi_user_todo_todo_filter_setting";

export async function generate_random_multi_user_todo_member_filter_settings_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMultiUserTodoTodoFilterSetting.ICreate>;
  },
): Promise<IMultiUserTodoTodoFilterSetting> {
  const prepared: IMultiUserTodoTodoFilterSetting.ICreate =
    prepare_random_multi_user_todo_todo_filter_setting(props.body);
  const result: IMultiUserTodoTodoFilterSetting =
    await api.functional.multiUserTodo.member.filter_settings.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}

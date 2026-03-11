import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodoFilterSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSetting";
import type { IMultiUserTodoTodoFilterSettingValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSettingValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_multi_user_todo_todo_filter_setting_value } from "../prepare/prepare_random_multi_user_todo_todo_filter_setting_value";

export async function generate_random_multi_user_todo_member_filter_settings_setting_values_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMultiUserTodoTodoFilterSettingValue.ICreate>;
    params: {
      filterSettingId: string;
    };
  },
): Promise<IMultiUserTodoTodoFilterSettingValue> {
  const prepared: IMultiUserTodoTodoFilterSettingValue.ICreate =
    prepare_random_multi_user_todo_todo_filter_setting_value(props.body);
  const result: IMultiUserTodoTodoFilterSettingValue =
    await api.functional.multiUserTodo.member.filter_settings.setting_values.create(
      connection,
      {
        filterSettingId: props.params.filterSettingId,
        body: prepared,
      },
    );
  return result;
}

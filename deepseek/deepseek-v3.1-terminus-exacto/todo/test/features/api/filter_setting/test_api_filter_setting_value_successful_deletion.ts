import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodoFilterSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSetting";
import type { IMultiUserTodoTodoFilterSettingValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSettingValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_filter_settings_create } from "../../../generate/generate_random_multi_user_todo_member_filter_settings_create";
import { generate_random_multi_user_todo_member_filter_settings_setting_values_create } from "../../../generate/generate_random_multi_user_todo_member_filter_settings_setting_values_create";
import { prepare_random_multi_user_todo_todo_filter_setting } from "../../../prepare/prepare_random_multi_user_todo_todo_filter_setting";
import { prepare_random_multi_user_todo_todo_filter_setting_value } from "../../../prepare/prepare_random_multi_user_todo_todo_filter_setting_value";

export async function test_api_filter_setting_value_successful_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create parent filter setting
  const filterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {},
    );
  typia.assert(filterSetting);
  // 3. Create filter setting value
  const settingValue =
    await generate_random_multi_user_todo_member_filter_settings_setting_values_create(
      memberConnection,
      {
        params: { filterSettingId: filterSetting.id },
        body: {
          key: RandomGenerator.alphabets(5),
          value: RandomGenerator.alphabets(10),
        },
      },
    );
  typia.assert(settingValue);
  // 4. Delete the setting value
  await api.functional.multiUserTodo.member.filter_settings.setting_values.erase(
    memberConnection,
    {
      filterSettingId: filterSetting.id,
      settingValueId: settingValue.id,
    },
  );
  // 5. Validate deletion by attempting to delete again (should error)
  await TestValidator.error(
    "deleting already deleted setting value should fail",
    async () => {
      await api.functional.multiUserTodo.member.filter_settings.setting_values.erase(
        memberConnection,
        {
          filterSettingId: filterSetting.id,
          settingValueId: settingValue.id,
        },
      );
    },
  );
  // 6. Verify parent filter setting still exists and is accessible
  //    (Create another value to ensure parent still works)
  const anotherSettingValue =
    await generate_random_multi_user_todo_member_filter_settings_setting_values_create(
      memberConnection,
      {
        params: { filterSettingId: filterSetting.id },
        body: {
          key: RandomGenerator.alphabets(6),
          value: RandomGenerator.alphabets(12),
        },
      },
    );
  typia.assert(anotherSettingValue);
  // Clean up: delete the new setting value
  await api.functional.multiUserTodo.member.filter_settings.setting_values.erase(
    memberConnection,
    {
      filterSettingId: filterSetting.id,
      settingValueId: anotherSettingValue.id,
    },
  );
}

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

/**
 * Test that attempting to delete the same filter setting value twice results in appropriate error handling.
 * After successfully deleting a value, a subsequent deletion request with the same IDs should fail with a 404 Not Found or similar error.
 * This validates proper idempotency behavior and ensures the system correctly tracks deleted resources.
 */
export async function test_api_filter_setting_value_deletion_twice_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Create a filter setting
  const filterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          filter_type: RandomGenerator.pick([
            "completion_status",
            "date_range",
            "priority",
          ] as const),
          is_default: typia.random<boolean>(),
        } satisfies IMultiUserTodoTodoFilterSetting.ICreate,
      },
    );
  typia.assert(filterSetting);
  // 3. Create a filter setting value
  const settingValue =
    await generate_random_multi_user_todo_member_filter_settings_setting_values_create(
      memberConnection,
      {
        params: {
          filterSettingId: filterSetting.id,
        },
        body: {
          key: RandomGenerator.alphabets(8),
          value: RandomGenerator.alphabets(12),
        } satisfies IMultiUserTodoTodoFilterSettingValue.ICreate,
      },
    );
  typia.assert(settingValue);
  // 4. Delete the filter setting value once (should succeed)
  await api.functional.multiUserTodo.member.filter_settings.setting_values.erase(
    memberConnection,
    {
      filterSettingId: filterSetting.id,
      settingValueId: settingValue.id,
    },
  );
  // 5. Attempt to delete the same filter setting value again (should fail with error)
  await TestValidator.error(
    "second deletion of same filter setting value should fail",
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
}

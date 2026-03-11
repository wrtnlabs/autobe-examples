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

export async function test_api_filter_setting_value_cross_user_access_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: RandomGenerator.name(1) + "@example.com",
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://referrer.example.com",
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Member A creates a filter setting using utility function
  const filterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          filter_type: "completion_status",
          is_default: false,
        },
      },
    );
  typia.assert(filterSetting);
  // 3. Member A creates a filter setting value using utility function
  const settingValue =
    await generate_random_multi_user_todo_member_filter_settings_setting_values_create(
      memberAConnection,
      {
        body: {
          key: "status",
          value: "completed",
        },
        params: {
          filterSettingId: filterSetting.id,
        },
      },
    );
  typia.assert(settingValue);
  // 4. Create Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: RandomGenerator.name(1) + "@test.com",
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test.com",
      referrer: "https://referrer.test.com",
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberB);
  // 5. Member B attempts to delete Member A's filter setting value (should fail)
  await TestValidator.error(
    "Member B cannot delete Member A's filter setting value",
    async () => {
      await api.functional.multiUserTodo.member.filter_settings.setting_values.erase(
        memberBConnection,
        {
          filterSettingId: filterSetting.id,
          settingValueId: settingValue.id,
        },
      );
    },
  );
}

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

export async function test_api_filter_setting_value_create_completion_status(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member);
  // Create filter setting
  const filterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          filter_type: "completion_status",
          is_default: false,
        } satisfies IMultiUserTodoTodoFilterSetting.ICreate,
      },
    );
  typia.assert(filterSetting);
  // Create filter setting value with completion_status key
  const filterSettingValue =
    await generate_random_multi_user_todo_member_filter_settings_setting_values_create(
      memberConnection,
      {
        body: {
          key: "completion_status",
          value: "incomplete",
        } satisfies IMultiUserTodoTodoFilterSettingValue.ICreate,
        params: {
          filterSettingId: filterSetting.id,
        },
      },
    );
  typia.assert(filterSettingValue);
  // Validate business logic (not type validation)
  TestValidator.equals(
    "key matches",
    filterSettingValue.key,
    "completion_status",
  );
  TestValidator.equals("value matches", filterSettingValue.value, "incomplete");
  // Test uniqueness constraint by trying to create duplicate key
  await TestValidator.error("duplicate key should fail", async () => {
    await generate_random_multi_user_todo_member_filter_settings_setting_values_create(
      memberConnection,
      {
        body: {
          key: "completion_status",
          value: "complete",
        } satisfies IMultiUserTodoTodoFilterSettingValue.ICreate,
        params: {
          filterSettingId: filterSetting.id,
        },
      },
    );
  });
}

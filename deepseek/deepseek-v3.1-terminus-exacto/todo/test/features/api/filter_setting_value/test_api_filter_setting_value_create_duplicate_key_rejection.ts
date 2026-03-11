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
 * Test business rule enforcement for duplicate keys within the same filter setting configuration.
 * 1. Create a member account and authenticate
 * 2. Create a parent filter setting
 * 3. Create first filter setting value with key 'date_range' and value 'today'
 * 4. Attempt to create second filter setting value with same key 'date_range' but different value 'tomorrow'
 * 5. Verify system rejects duplicate key with appropriate business error
 */
export async function test_api_filter_setting_value_create_duplicate_key_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Create parent filter setting
  const filterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          filter_type: "date_range",
          is_default: false,
        },
      },
    );
  typia.assert(filterSetting);
  // 3. Create first filter setting value
  const firstValue =
    await generate_random_multi_user_todo_member_filter_settings_setting_values_create(
      memberConnection,
      {
        body: {
          key: "date_range",
          value: "today",
        },
        params: {
          filterSettingId: filterSetting.id,
        },
      },
    );
  typia.assert(firstValue);
  // 4. Attempt to create duplicate key with different value
  await TestValidator.error(
    "duplicate key within same filter setting should be rejected",
    async () => {
      await generate_random_multi_user_todo_member_filter_settings_setting_values_create(
        memberConnection,
        {
          body: {
            key: "date_range",
            value: "tomorrow",
          },
          params: {
            filterSettingId: filterSetting.id,
          },
        },
      );
    },
  );
  // 5. Validate that first value was created successfully
  TestValidator.equals("first value key matches", firstValue.key, "date_range");
  TestValidator.equals("first value value matches", firstValue.value, "today");
  TestValidator.equals(
    "first value parent filter setting matches",
    firstValue.filterSetting.id,
    filterSetting.id,
  );
}

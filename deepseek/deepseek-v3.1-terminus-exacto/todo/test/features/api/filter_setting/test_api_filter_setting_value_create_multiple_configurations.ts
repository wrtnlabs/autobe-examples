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
 * Test creating multiple filter setting values for a complex filter configuration.
 * 1. Member joins/authenticates
 * 2. Create parent filter setting
 * 3. Create multiple filter setting values with different keys
 * 4. Validate each creation and verify parent linkage
 */
export async function test_api_filter_setting_value_create_multiple_configurations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create parent filter setting
  const filterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          filter_type: "advanced",
          is_default: false,
        },
      },
    );
  typia.assert(filterSetting);
  // Track parent filter setting's initial timestamp
  const initialUpdatedAt = filterSetting.updated_at;
  // 3. Define multiple filter setting values to create
  const valuesToCreate = [
    {
      key: "completion_status" as const,
      value: "incomplete" as const,
    },
    {
      key: "priority" as const,
      value: "high" as const,
    },
    {
      key: "date_range" as const,
      value: "week" as const,
    },
  ] as const;
  // 4. Create each filter setting value
  const createdValues: IMultiUserTodoTodoFilterSettingValue[] = [];
  for (const valueConfig of valuesToCreate) {
    // Use SDK directly since no utility function for this exact parameter combination
    const createdValue =
      await api.functional.multiUserTodo.member.filter_settings.setting_values.create(
        memberConnection,
        {
          filterSettingId: filterSetting.id,
          body: {
            key: valueConfig.key,
            value: valueConfig.value,
          } satisfies IMultiUserTodoTodoFilterSettingValue.ICreate,
        },
      );
    typia.assert(createdValue);
    createdValues.push(createdValue);
    // Validate key and value match input
    TestValidator.equals(
      `key matches for ${valueConfig.key}`,
      createdValue.key,
      valueConfig.key,
    );
    TestValidator.equals(
      `value matches for ${valueConfig.key}`,
      createdValue.value,
      valueConfig.value,
    );
    // Validate parent filter setting linkage
    TestValidator.equals(
      `parent filter setting id matches for ${valueConfig.key}`,
      createdValue.filterSetting.id,
      filterSetting.id,
    );
    // Note: Cannot verify updated_at from summary type ISummary
    // The filterSetting field in createdValue is ISummary without updated_at
  }
  // 5. Verify all values were created
  TestValidator.equals(
    "all filter setting values created",
    createdValues.length,
    valuesToCreate.length,
  );
  // 6. Verify distinct keys
  const createdKeys = createdValues.map((v) => v.key);
  const uniqueKeys = new Set(createdKeys);
  TestValidator.equals(
    "each key should be unique",
    uniqueKeys.size,
    valuesToCreate.length,
  );
  // 7. Verify parent filter setting linkage consistency
  for (const createdValue of createdValues) {
    TestValidator.equals(
      "consistent parent filter setting id",
      createdValue.filterSetting.id,
      filterSetting.id,
    );
    TestValidator.equals(
      "consistent parent filter setting name",
      createdValue.filterSetting.name,
      filterSetting.name,
    );
    TestValidator.equals(
      "consistent parent filter setting filter_type",
      createdValue.filterSetting.filter_type,
      filterSetting.filter_type,
    );
  }
  // 8. Verify parent filter setting's updated_at increased
  // Note: Cannot verify without GET endpoint to fetch updated parent filter setting
  // The filterSetting field in createdValue is ISummary without updated_at
}
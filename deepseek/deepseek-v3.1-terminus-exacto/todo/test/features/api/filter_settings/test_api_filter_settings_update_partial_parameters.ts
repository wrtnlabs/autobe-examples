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
 * Test partial update of filter setting values where only specific parameters are modified.
 *
 * This scenario validates that users can update individual fields without affecting
 * other parameters. Create a filter setting with multiple values, then update only
 * the 'value' field while keeping the 'key' unchanged. Verify that the operation
 * correctly updates the specified field while preserving unchanged fields. Test the
 * inverse scenario - updating only the 'key' field while preserving the 'value'.
 * Validate that partial updates maintain data consistency and that the system
 * properly handles nullable or optional fields in the update DTO.
 */
export async function test_api_filter_settings_update_partial_parameters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member session
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorizedMember);
  // 2. Create filter setting
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
  // 3. Create initial filter setting value with both key and value
  const initialKey = "completion_status";
  const initialValue = "incomplete";
  const filterSettingValue =
    await generate_random_multi_user_todo_member_filter_settings_setting_values_create(
      memberConnection,
      {
        body: {
          key: initialKey,
          value: initialValue,
        } satisfies IMultiUserTodoTodoFilterSettingValue.ICreate,
        params: {
          filterSettingId: filterSetting.id,
        },
      },
    );
  typia.assert(filterSettingValue);
  // Verify initial state
  TestValidator.equals(
    "initial key matches",
    filterSettingValue.key,
    initialKey,
  );
  TestValidator.equals(
    "initial value matches",
    filterSettingValue.value,
    initialValue,
  );
  TestValidator.equals(
    "parent filter setting matches",
    filterSettingValue.filterSetting.id,
    filterSetting.id,
  );
  // 4. Test Scenario 1: Update only the value field
  const newValue = "completed";
  const updatedValueOnly =
    await api.functional.multiUserTodo.member.filter_settings.setting_values.update(
      memberConnection,
      {
        filterSettingId: filterSetting.id,
        settingValueId: filterSettingValue.id,
        body: {
          value: newValue,
        } satisfies IMultiUserTodoTodoFilterSettingValue.IUpdate,
      },
    );
  typia.assert(updatedValueOnly);
  // Verify only value changed, key remains the same
  TestValidator.equals(
    "key unchanged when updating value",
    updatedValueOnly.key,
    initialKey,
  );
  TestValidator.equals("value updated", updatedValueOnly.value, newValue);
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedValueOnly.updated_at,
    filterSettingValue.updated_at,
  );
  TestValidator.predicate(
    "updated_at is newer than created_at",
    () =>
      new Date(updatedValueOnly.updated_at) >
      new Date(filterSettingValue.created_at),
  );
  // 5. Test Scenario 2: Update only the key field
  const newKey = "priority";
  const updatedKeyOnly =
    await api.functional.multiUserTodo.member.filter_settings.setting_values.update(
      memberConnection,
      {
        filterSettingId: filterSetting.id,
        settingValueId: filterSettingValue.id,
        body: {
          key: newKey,
        } satisfies IMultiUserTodoTodoFilterSettingValue.IUpdate,
      },
    );
  typia.assert(updatedKeyOnly);
  // Verify only key changed, value remains the same (from previous update)
  TestValidator.equals("key updated", updatedKeyOnly.key, newKey);
  TestValidator.equals(
    "value unchanged when updating key",
    updatedKeyOnly.value,
    newValue,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedKeyOnly.updated_at,
    updatedValueOnly.updated_at,
  );
  TestValidator.predicate(
    "second update updated_at is newer",
    () =>
      new Date(updatedKeyOnly.updated_at) >
      new Date(updatedValueOnly.updated_at),
  );
  // 6. Test Scenario 3: Update both fields
  const finalKey = "due_date";
  const finalValue = "overdue";
  const updatedBoth =
    await api.functional.multiUserTodo.member.filter_settings.setting_values.update(
      memberConnection,
      {
        filterSettingId: filterSetting.id,
        settingValueId: filterSettingValue.id,
        body: {
          key: finalKey,
          value: finalValue,
        } satisfies IMultiUserTodoTodoFilterSettingValue.IUpdate,
      },
    );
  typia.assert(updatedBoth);
  // Verify both fields updated
  TestValidator.equals("final key updated", updatedBoth.key, finalKey);
  TestValidator.equals("final value updated", updatedBoth.value, finalValue);
  TestValidator.notEquals(
    "updated_at timestamp changed for both update",
    updatedBoth.updated_at,
    updatedKeyOnly.updated_at,
  );
  TestValidator.predicate(
    "third update updated_at is newest",
    () =>
      new Date(updatedBoth.updated_at) > new Date(updatedKeyOnly.updated_at),
  );
  // 7. Verify parent relationship remains intact throughout updates
  TestValidator.equals(
    "parent filter setting ID consistent",
    updatedBoth.filterSetting.id,
    filterSetting.id,
  );
  TestValidator.equals(
    "filter setting value ID constant",
    updatedBoth.id,
    filterSettingValue.id,
  );
  // 8. Test edge case: empty update (no fields specified)
  const unchangedUpdate =
    await api.functional.multiUserTodo.member.filter_settings.setting_values.update(
      memberConnection,
      {
        filterSettingId: filterSetting.id,
        settingValueId: filterSettingValue.id,
        body: {} satisfies IMultiUserTodoTodoFilterSettingValue.IUpdate,
      },
    );
  typia.assert(unchangedUpdate);
  // Verify no changes when empty update
  TestValidator.equals(
    "no change to key with empty update",
    unchangedUpdate.key,
    finalKey,
  );
  TestValidator.equals(
    "no change to value with empty update",
    unchangedUpdate.value,
    finalValue,
  );
  TestValidator.equals(
    "no change to updated_at with empty update",
    unchangedUpdate.updated_at,
    updatedBoth.updated_at,
  );
}

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
 * Test ownership validation when updating filter setting values.
 * Validates that users cannot update filter settings belonging to other users.
 */
export async function test_api_filter_settings_update_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account and authenticate
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member1);
  // 2. Create filter setting for first member
  const filterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          filter_type: "completion_status",
          is_default: false,
        } satisfies IMultiUserTodoTodoFilterSetting.ICreate,
      },
    );
  typia.assert(filterSetting);
  // 3. Create filter setting value for first member
  const settingValue =
    await generate_random_multi_user_todo_member_filter_settings_setting_values_create(
      member1Connection,
      {
        body: {
          key: "status_filter",
          value: "incomplete",
        } satisfies IMultiUserTodoTodoFilterSettingValue.ICreate,
        params: {
          filterSettingId: filterSetting.id,
        },
      },
    );
  typia.assert(settingValue);
  // 4. Create second member account and authenticate
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member2);
  // 5. Attempt to update member1's filter setting value using member2's authentication
  await TestValidator.error(
    "member2 cannot update member1's filter setting value",
    async () => {
      await api.functional.multiUserTodo.member.filter_settings.setting_values.update(
        member2Connection,
        {
          filterSettingId: filterSetting.id,
          settingValueId: settingValue.id,
          body: {
            key: "updated_status",
            value: "complete",
          } satisfies IMultiUserTodoTodoFilterSettingValue.IUpdate,
        },
      );
    },
  );
  // 6. Verify that the original filter setting value still exists and belongs to member1
  // Note: There's no GET endpoint provided, but we can verify by attempting
  // to update with the correct owner should succeed
  const updatedValue =
    await api.functional.multiUserTodo.member.filter_settings.setting_values.update(
      member1Connection,
      {
        filterSettingId: filterSetting.id,
        settingValueId: settingValue.id,
        body: {
          value: "verified_value",
        } satisfies IMultiUserTodoTodoFilterSettingValue.IUpdate,
      },
    );
  typia.assert(updatedValue);
  TestValidator.equals(
    "updated value key remains unchanged",
    updatedValue.key,
    settingValue.key,
  );
  TestValidator.notEquals(
    "value was updated by owner",
    updatedValue.value,
    settingValue.value,
  );
  TestValidator.equals(
    "filter setting ownership unchanged",
    updatedValue.filterSetting.id,
    filterSetting.id,
  );
}

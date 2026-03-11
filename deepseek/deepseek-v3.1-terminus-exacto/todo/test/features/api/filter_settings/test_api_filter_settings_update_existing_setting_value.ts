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

export async function test_api_filter_settings_update_existing_setting_value(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member);
  // 2. Create parent filter setting
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
  // 3. Create initial filter setting value
  const initialValue =
    await generate_random_multi_user_todo_member_filter_settings_setting_values_create(
      memberConnection,
      {
        body: {
          key: "status",
          value: "incomplete",
        } satisfies IMultiUserTodoTodoFilterSettingValue.ICreate,
        params: {
          filterSettingId: filterSetting.id,
        },
      },
    );
  typia.assert(initialValue);
  // 4. Update the filter setting value
  const updatedValue =
    await api.functional.multiUserTodo.member.filter_settings.setting_values.update(
      memberConnection,
      {
        filterSettingId: filterSetting.id,
        settingValueId: initialValue.id,
        body: {
          key: "completion_status",
          value: "complete",
        } satisfies IMultiUserTodoTodoFilterSettingValue.IUpdate,
      },
    );
  typia.assert(updatedValue);
  // 5. Validate updates
  TestValidator.equals(
    "key should be updated",
    updatedValue.key,
    "completion_status",
  );
  TestValidator.equals(
    "value should be updated",
    updatedValue.value,
    "complete",
  );
  TestValidator.notEquals(
    "updated_at should be refreshed",
    updatedValue.updated_at,
    initialValue.updated_at,
  );
  TestValidator.equals(
    "id should remain same",
    updatedValue.id,
    initialValue.id,
  );
  TestValidator.equals(
    "filterSetting.id should remain same",
    (updatedValue.filterSetting as any).id,
    filterSetting.id,
  );
  TestValidator.equals(
    "created_at should not change",
    updatedValue.created_at,
    initialValue.created_at,
  );
  // 6. Validate member ownership
  TestValidator.equals(
    "filterSetting.member.id should match owner",
    ((updatedValue.filterSetting as any).member as any).id,
    member.id,
  );
}
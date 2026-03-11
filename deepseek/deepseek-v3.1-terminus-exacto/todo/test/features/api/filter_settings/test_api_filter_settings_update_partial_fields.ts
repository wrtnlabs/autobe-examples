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
import { prepare_random_multi_user_todo_todo_filter_setting } from "../../../prepare/prepare_random_multi_user_todo_todo_filter_setting";

export async function test_api_filter_settings_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Register and authenticate member
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
  // Create initial filter setting with complete configuration
  const initialFilterSetting =
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
  typia.assert(initialFilterSetting);
  // Test 1: Update only the name field
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const nameOnlyUpdate =
    await api.functional.multiUserTodo.member.filter_settings.update(
      memberConnection,
      {
        filterSettingId: initialFilterSetting.id,
        body: {
          name: updatedName,
        } satisfies IMultiUserTodoTodoFilterSetting.IUpdate,
      },
    );
  typia.assert(nameOnlyUpdate);
  // Verify only name changed
  TestValidator.equals(
    "name should be updated",
    nameOnlyUpdate.name,
    updatedName,
  );
  TestValidator.equals(
    "filter_type should remain unchanged",
    nameOnlyUpdate.filter_type,
    initialFilterSetting.filter_type,
  );
  TestValidator.equals(
    "is_default should remain unchanged",
    nameOnlyUpdate.is_default,
    initialFilterSetting.is_default,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(nameOnlyUpdate.updated_at) >
      new Date(initialFilterSetting.updated_at),
  );
  // Test 2: Update only the is_default field
  const defaultOnlyUpdate =
    await api.functional.multiUserTodo.member.filter_settings.update(
      memberConnection,
      {
        filterSettingId: initialFilterSetting.id,
        body: {
          is_default: true,
        } satisfies IMultiUserTodoTodoFilterSetting.IUpdate,
      },
    );
  typia.assert(defaultOnlyUpdate);
  // Verify only is_default changed
  TestValidator.equals(
    "is_default should be updated",
    defaultOnlyUpdate.is_default,
    true,
  );
  TestValidator.equals(
    "name should remain unchanged",
    defaultOnlyUpdate.name,
    updatedName,
  );
  TestValidator.equals(
    "filter_type should remain unchanged",
    defaultOnlyUpdate.filter_type,
    initialFilterSetting.filter_type,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(defaultOnlyUpdate.updated_at) >
      new Date(nameOnlyUpdate.updated_at),
  );
  // Test 3: Update only the filter_type field
  const newFilterType = "date_range";
  const typeOnlyUpdate =
    await api.functional.multiUserTodo.member.filter_settings.update(
      memberConnection,
      {
        filterSettingId: initialFilterSetting.id,
        body: {
          filter_type: newFilterType,
        } satisfies IMultiUserTodoTodoFilterSetting.IUpdate,
      },
    );
  typia.assert(typeOnlyUpdate);
  // Verify only filter_type changed
  TestValidator.equals(
    "filter_type should be updated",
    typeOnlyUpdate.filter_type,
    newFilterType,
  );
  TestValidator.equals(
    "name should remain unchanged",
    typeOnlyUpdate.name,
    updatedName,
  );
  TestValidator.equals(
    "is_default should remain unchanged",
    typeOnlyUpdate.is_default,
    true,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(typeOnlyUpdate.updated_at) >
      new Date(defaultOnlyUpdate.updated_at),
  );
  // Test 4: Update only filterSettingValues
  const filterValuesUpdate =
    await api.functional.multiUserTodo.member.filter_settings.update(
      memberConnection,
      {
        filterSettingId: initialFilterSetting.id,
        body: {
          filterSettingValues: [
            {
              key: "status",
              value: "completed",
            } satisfies IMultiUserTodoTodoFilterSettingValue.IUpdate,
          ],
        } satisfies IMultiUserTodoTodoFilterSetting.IUpdate,
      },
    );
  typia.assert(filterValuesUpdate);
  // Verify only filterSettingValues were updated (other fields remain unchanged)
  TestValidator.equals(
    "name should remain unchanged",
    filterValuesUpdate.name,
    updatedName,
  );
  TestValidator.equals(
    "filter_type should remain unchanged",
    filterValuesUpdate.filter_type,
    newFilterType,
  );
  TestValidator.equals(
    "is_default should remain unchanged",
    filterValuesUpdate.is_default,
    true,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(filterValuesUpdate.updated_at) >
      new Date(typeOnlyUpdate.updated_at),
  );
  // Final validation: Verify member ownership remains consistent
  TestValidator.equals(
    "member id should remain unchanged",
    filterValuesUpdate.member.id,
    member.id,
  );
}

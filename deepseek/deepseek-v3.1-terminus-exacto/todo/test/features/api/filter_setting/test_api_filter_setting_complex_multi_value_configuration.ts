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

/**
 * Test complex filter configuration scenario where a filter setting contains multiple setting values
 * for combined filtering criteria. This test validates the retrieval of individual filter setting
 * values and demonstrates the extensibility of filter criteria types.
 */
export async function test_api_filter_setting_complex_multi_value_configuration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
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
  // 2. Create a filter setting configuration
  const filterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: "Test Filter Configuration",
          filter_type: "composite_filter",
          is_default: false,
        } satisfies IMultiUserTodoTodoFilterSetting.ICreate,
      },
    );
  typia.assert(filterSetting);
  // 3. Test error handling for non-existent setting values
  // Since there's no API to create setting values, we test the error response
  const nonExistentSettingValueId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "retrieving non-existent setting value should fail",
    async () => {
      await api.functional.multiUserTodo.member.filter_settings.setting_values.at(
        memberConnection,
        {
          filterSettingId: filterSetting.id,
          settingValueId: nonExistentSettingValueId,
        },
      );
    },
  );
  // 4. Validate that the filter setting was created successfully
  TestValidator.equals(
    "filter setting has correct name",
    filterSetting.name,
    "Test Filter Configuration",
  );
  TestValidator.equals(
    "filter setting has correct type",
    filterSetting.filter_type,
    "composite_filter",
  );
  TestValidator.predicate(
    "filter setting is not default",
    !filterSetting.is_default,
  );
  TestValidator.equals(
    "filter setting belongs to member",
    filterSetting.member.id,
    member.id,
  );
  // 5. Test the structure of the filter setting response
  TestValidator.predicate(
    "filter setting has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      filterSetting.id,
    ),
  );
  TestValidator.predicate(
    "filter setting has valid creation timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(filterSetting.created_at),
  );
  TestValidator.predicate(
    "filter setting has valid update timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(filterSetting.updated_at),
  );
  // 6. Validate member information in the filter setting response
  TestValidator.equals(
    "member email matches",
    filterSetting.member.email,
    member.email,
  );
  TestValidator.equals(
    "member display name matches",
    filterSetting.member.display_name,
    member.display_name,
  );
  TestValidator.predicate(
    "member has valid creation timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      filterSetting.member.created_at,
    ),
  );
}

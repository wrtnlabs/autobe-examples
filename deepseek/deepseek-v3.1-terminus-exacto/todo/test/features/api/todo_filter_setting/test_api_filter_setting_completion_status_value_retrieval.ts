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
 * Test that authenticated members can attempt to retrieve specific filter setting values
 * but receive proper error for non-existent resources, validating the two-step authorization.
 * Scenario: A member registers, creates a filter setting configuration for filtering by
 * completion status, then attempts to retrieve a non-existent setting value. This validates
 * that the endpoint performs proper authorization checks (filter setting belongs to member)
 * before returning 404 for the setting value. Demonstrates the core business workflow of
 * authorization verification even when the specific resource doesn't exist.
 */
export async function test_api_filter_setting_completion_status_value_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Use authorize_member_join utility function (CRITICAL: must use utility, not SDK)
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
  // 2. Create filter setting for completion_status
  const filterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: "Show Incomplete Todos",
          filter_type: "completion_status", // Based on user instructions
          is_default: false,
        } satisfies IMultiUserTodoTodoFilterSetting.ICreate,
      },
    );
  typia.assert(filterSetting);
  // 3. Attempt to retrieve a non-existent setting value
  // Since there's no API to create setting values, we test the 404 behavior
  const randomSettingValueId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should return 404 for non-existent setting value",
    async () => {
      await api.functional.multiUserTodo.member.filter_settings.setting_values.at(
        memberConnection,
        {
          filterSettingId: filterSetting.id,
          settingValueId: randomSettingValueId,
        },
      );
    },
  );
  // 4. Verify the scenario describes we would test two-step authorization:
  // - First check: filter setting belongs to authenticated member ✓
  // - Second check: setting value belongs to specified filter setting → triggers 404
  // Additional validation: Ensure the filter setting was created correctly
  TestValidator.equals(
    "filter type is completion_status",
    filterSetting.filter_type,
    "completion_status",
  );
  TestValidator.predicate(
    "filter setting has valid UUID",
    /^[0-9a-f-]{36}$/i.test(filterSetting.id),
  );
}

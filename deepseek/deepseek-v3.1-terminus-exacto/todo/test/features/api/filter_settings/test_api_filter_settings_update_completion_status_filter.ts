import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodoFilterSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSetting";
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
 * Test updating filter setting values specifically for completion status filtering.
 * Create a filter setting focused on completion status, then update various filter
 * parameters to test the update functionality. Verify that the operation correctly
 * handles filter parameter updates and returns the updated filter configuration.
 */
export async function test_api_filter_settings_update_completion_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate member
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Create completion status filter setting
  const filterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: "Completion Status Filter",
          filter_type: "completion_status",
          is_default: false,
        } satisfies IMultiUserTodoTodoFilterSetting.ICreate,
      },
    );
  typia.assert(filterSetting);
  // 3. Test updating filter setting with search parameter
  const searchUpdate =
    await api.functional.multiUserTodo.member.filter_settings.setting_values.updateSettingValues(
      memberConnection,
      {
        filterSettingId: filterSetting.id,
        body: {
          search: "test",
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(searchUpdate);
  TestValidator.equals(
    "filter type remains",
    searchUpdate.filter_type,
    "completion_status",
  );
  // 4. Test updating filter setting with is_default parameter
  const defaultUpdate =
    await api.functional.multiUserTodo.member.filter_settings.setting_values.updateSettingValues(
      memberConnection,
      {
        filterSettingId: filterSetting.id,
        body: {
          is_default: true,
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(defaultUpdate);
  TestValidator.equals("is_default updated", defaultUpdate.is_default, true);
  // 5. Test updating filter setting with pagination parameters
  const paginationUpdate =
    await api.functional.multiUserTodo.member.filter_settings.setting_values.updateSettingValues(
      memberConnection,
      {
        filterSettingId: filterSetting.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(paginationUpdate);
  TestValidator.equals(
    "filter type remains",
    paginationUpdate.filter_type,
    "completion_status",
  );
  // 6. Validate that updates preserve the original filter setting structure
  TestValidator.equals(
    "ID remains consistent",
    paginationUpdate.id,
    filterSetting.id,
  );
  TestValidator.equals(
    "name remains consistent",
    paginationUpdate.name,
    filterSetting.name,
  );
  TestValidator.equals(
    "member ID remains consistent",
    paginationUpdate.member.id,
    filterSetting.member.id,
  );
}

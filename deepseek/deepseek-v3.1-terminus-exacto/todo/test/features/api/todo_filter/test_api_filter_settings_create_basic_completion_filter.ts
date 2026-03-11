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
 * Test that a member can create a basic completion status filter setting.
 *
 * 1. Authenticate as a member using authorize_member_join
 * 2. Create a filter setting with name 'Work Tasks', filter_type 'completion_status', and is_default set to true
 * 3. Validate the response includes correct name, filter_type, is_default, member ownership
 * 4. Ensure timestamps (created_at, updated_at) are set properly and deleted_at is null
 * 5. Verify that the member object in response matches the authenticated member
 */
export async function test_api_filter_settings_create_basic_completion_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection using authorize_member_join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Prepare filter setting creation data with basic completion filter
  const filterSettingName = "Work Tasks";
  const filterType = "completion_status";
  // Use utility function to create filter setting
  const filterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: filterSettingName,
          filter_type: filterType,
          is_default: true,
        } satisfies IMultiUserTodoTodoFilterSetting.ICreate,
      },
    );
  typia.assert(filterSetting);
  // 3. Validate response data
  TestValidator.equals(
    "filter name matches",
    filterSetting.name,
    filterSettingName,
  );
  TestValidator.equals(
    "filter type matches",
    filterSetting.filter_type,
    filterType,
  );
  TestValidator.predicate("is_default is true", filterSetting.is_default);
  // 4. Validate member ownership
  TestValidator.equals(
    "member id matches",
    filterSetting.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "member email matches",
    filterSetting.member.email,
    memberAuth.email,
  );
  TestValidator.equals(
    "member display_name matches",
    filterSetting.member.display_name,
    memberAuth.display_name,
  );
  // 5. Validate timestamps and deletion status
  TestValidator.predicate("created_at is valid ISO string", () => {
    const date = new Date(filterSetting.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid ISO string", () => {
    const date = new Date(filterSetting.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals("deleted_at is null", filterSetting.deleted_at, null);
  // 6. Verify timestamps are reasonably close (created_at and updated_at should be same or very close on creation)
  const createdDate = new Date(filterSetting.created_at);
  const updatedDate = new Date(filterSetting.updated_at);
  const timeDiff = Math.abs(createdDate.getTime() - updatedDate.getTime());
  TestValidator.predicate(
    "created_at and updated_at are close on creation",
    timeDiff < 10000,
  ); // Within 10 seconds
}

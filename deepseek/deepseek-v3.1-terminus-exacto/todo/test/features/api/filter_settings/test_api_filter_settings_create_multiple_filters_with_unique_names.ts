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
 * Test that a member can create multiple filter settings with different unique names.
 *
 * 1. Authenticate as a member using authorize_member_join utility function
 * 2. Create first filter setting with name 'Personal Todos' and is_default false
 * 3. Create second filter setting with name 'Work Todos' and is_default true
 * 4. Validate that both filters are created successfully with distinct IDs
 * 5. Verify that when is_default true is set on the second filter, the system properly handles the default status
 * 6. Check that the response includes correct member ownership and that each filter has unique name as required by the uniqueness constraint
 */
export async function test_api_filter_settings_create_multiple_filters_with_unique_names(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
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
  // 2. Create first filter setting: Personal Todos with is_default: false
  const personalFilter =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: "Personal Todos",
          filter_type: "completion_status",
          is_default: false,
        } satisfies IMultiUserTodoTodoFilterSetting.ICreate,
      },
    );
  typia.assert(personalFilter);
  // 3. Create second filter setting: Work Todos with is_default: true
  const workFilter =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: "Work Todos",
          filter_type: "completion_status",
          is_default: true,
        } satisfies IMultiUserTodoTodoFilterSetting.ICreate,
      },
    );
  typia.assert(workFilter);
  // 4. Validate both filters were created successfully with distinct IDs
  TestValidator.equals(
    "personal filter has UUID format",
    /^[0-9a-f-]{36}$/i.test(personalFilter.id),
    true,
  );
  TestValidator.equals(
    "work filter has UUID format",
    /^[0-9a-f-]{36}$/i.test(workFilter.id),
    true,
  );
  TestValidator.notEquals(
    "filter IDs should be distinct",
    personalFilter.id,
    workFilter.id,
  );
  // 5. Verify filter properties match creation input
  TestValidator.equals(
    "personal filter name matches",
    personalFilter.name,
    "Personal Todos",
  );
  TestValidator.equals(
    "personal filter is_default false",
    personalFilter.is_default,
    false,
  );
  TestValidator.equals(
    "work filter name matches",
    workFilter.name,
    "Work Todos",
  );
  TestValidator.equals(
    "work filter is_default true",
    workFilter.is_default,
    true,
  );
  // 6. Validate member ownership
  TestValidator.equals(
    "personal filter member ID matches",
    personalFilter.member.id,
    member.id,
  );
  TestValidator.equals(
    "work filter member ID matches",
    workFilter.member.id,
    member.id,
  );
  TestValidator.equals(
    "personal filter member email matches",
    personalFilter.member.email,
    member.email,
  );
  TestValidator.equals(
    "work filter member email matches",
    workFilter.member.email,
    member.email,
  );
  TestValidator.equals(
    "personal filter member display_name matches",
    personalFilter.member.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "work filter member display_name matches",
    workFilter.member.display_name,
    member.display_name,
  );
  // 7. Validate timestamps and soft-deletion
  TestValidator.predicate(
    "personal filter has created_at",
    !!personalFilter.created_at,
  );
  TestValidator.predicate(
    "personal filter has updated_at",
    !!personalFilter.updated_at,
  );
  TestValidator.equals(
    "personal filter deleted_at is null",
    personalFilter.deleted_at,
    null,
  );
  TestValidator.predicate(
    "work filter has created_at",
    !!workFilter.created_at,
  );
  TestValidator.predicate(
    "work filter has updated_at",
    !!workFilter.updated_at,
  );
  TestValidator.equals(
    "work filter deleted_at is null",
    workFilter.deleted_at,
    null,
  );
}

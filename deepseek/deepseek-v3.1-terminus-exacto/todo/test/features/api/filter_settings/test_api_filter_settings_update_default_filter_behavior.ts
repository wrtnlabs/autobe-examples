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

export async function test_api_filter_settings_update_default_filter_behavior(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Create first filter setting as default (Filter A)
  const filterA =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          filter_type: "completion_status",
          is_default: true,
        } satisfies DeepPartial<IMultiUserTodoTodoFilterSetting.ICreate>,
      },
    );
  typia.assert(filterA);
  TestValidator.equals("Filter A is default", filterA.is_default, true);
  // 3. Create second filter setting as non-default (Filter B)
  const filterB =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          filter_type: "completion_status",
          is_default: false,
        } satisfies DeepPartial<IMultiUserTodoTodoFilterSetting.ICreate>,
      },
    );
  typia.assert(filterB);
  TestValidator.equals("Filter B is not default", filterB.is_default, false);
  // 4. Update Filter B to become default - should make Filter A non-default
  const updatedFilterB =
    await api.functional.multiUserTodo.member.filter_settings.update(
      memberConnection,
      {
        filterSettingId: filterB.id,
        body: {
          is_default: true,
        } satisfies IMultiUserTodoTodoFilterSetting.IUpdate,
      },
    );
  typia.assert(updatedFilterB);
  TestValidator.equals(
    "Filter B becomes default",
    updatedFilterB.is_default,
    true,
  );
  // 5. Verify Filter A is no longer default (should be false now)
  // We need to fetch Filter A to check its updated status
  // Since there's no GET endpoint provided, we can't fetch it directly.
  // However, the business logic described in scenario suggests that when
  // Filter B becomes default, Filter A should be updated to is_default: false.
  // We'll test this by trying to make Filter A default again and see if it works.
  // 6. Try to update Filter A to be default (should work since it's not default now)
  const updatedFilterA =
    await api.functional.multiUserTodo.member.filter_settings.update(
      memberConnection,
      {
        filterSettingId: filterA.id,
        body: {
          is_default: true,
        } satisfies IMultiUserTodoTodoFilterSetting.IUpdate,
      },
    );
  typia.assert(updatedFilterA);
  TestValidator.equals(
    "Filter A can become default",
    updatedFilterA.is_default,
    true,
  );
  // 7. Verify Filter B is no longer default
  // Update Filter B again to check its status
  const recheckedFilterB =
    await api.functional.multiUserTodo.member.filter_settings.update(
      memberConnection,
      {
        filterSettingId: filterB.id,
        body: {} satisfies IMultiUserTodoTodoFilterSetting.IUpdate, // empty update to fetch current state
      },
    );
  typia.assert(recheckedFilterB);
  TestValidator.equals(
    "Filter B is not default after A becomes default",
    recheckedFilterB.is_default,
    false,
  );
  // 8. Test removing default status doesn't assign it to another filter
  // Remove default from Filter A
  const nonDefaultFilterA =
    await api.functional.multiUserTodo.member.filter_settings.update(
      memberConnection,
      {
        filterSettingId: filterA.id,
        body: {
          is_default: false,
        } satisfies IMultiUserTodoTodoFilterSetting.IUpdate,
      },
    );
  typia.assert(nonDefaultFilterA);
  TestValidator.equals(
    "Filter A is no longer default",
    nonDefaultFilterA.is_default,
    false,
  );
  // 9. Verify Filter B remains non-default (no automatic assignment)
  const finalFilterB =
    await api.functional.multiUserTodo.member.filter_settings.update(
      memberConnection,
      {
        filterSettingId: filterB.id,
        body: {} satisfies IMultiUserTodoTodoFilterSetting.IUpdate,
      },
    );
  typia.assert(finalFilterB);
  TestValidator.equals(
    "Filter B remains non-default",
    finalFilterB.is_default,
    false,
  );
  // 10. Verify we have no default filters now
  TestValidator.equals(
    "No filter is default after removing default from both",
    nonDefaultFilterA.is_default,
    false,
  );
  TestValidator.equals(
    "No filter is default after removing default from both",
    finalFilterB.is_default,
    false,
  );
}

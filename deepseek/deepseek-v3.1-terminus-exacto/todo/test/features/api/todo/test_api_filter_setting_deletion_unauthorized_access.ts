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
 * Test unauthorized deletion of another user's filter setting.
 * 1. First member registers and creates a filter setting.
 * 2. Second member registers and attempts to delete the first member's filter setting.
 * 3. Validate that the operation returns 403 Forbidden error, enforcing data isolation.
 */
export async function test_api_filter_setting_deletion_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate first member
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. First member creates a filter setting
  const filterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      firstMemberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          filter_type: RandomGenerator.pick([
            "completion_status",
            "date_range",
            "priority",
          ] as const),
          is_default: RandomGenerator.pick([true, false] as const),
        } satisfies IMultiUserTodoTodoFilterSetting.ICreate,
      },
    );
  typia.assert(filterSetting);
  // 3. Create and authenticate second member
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(secondMember);
  // 4. Second member attempts to delete first member's filter setting
  await TestValidator.httpError(
    "second member cannot delete first member's filter setting",
    403,
    async () =>
      await api.functional.multiUserTodo.member.filter_settings.erase(
        secondMemberConnection,
        {
          filterSettingId: filterSetting.id,
        },
      ),
  );
  // 5. Verify filter setting still exists by attempting to delete it with the rightful owner
  await api.functional.multiUserTodo.member.filter_settings.erase(
    firstMemberConnection,
    {
      filterSettingId: filterSetting.id,
    },
  );
  // The erase function returns void, so no typia.assert needed
}

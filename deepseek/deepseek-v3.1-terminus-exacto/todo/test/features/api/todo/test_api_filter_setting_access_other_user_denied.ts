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
 * Test that users cannot access filter settings belonging to other users.
 *
 * 1. Create first member account and authenticate as member1
 * 2. Create a filter setting with member1 (owner)
 * 3. Create second member account and authenticate as member2 (different user)
 * 4. Attempt to retrieve member1's filter setting using member2's connection
 * 5. Verify access is denied with proper authorization error
 */
export async function test_api_filter_setting_access_other_user_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate first member (owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a filter setting with first member
  const filterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          filter_type: "completion_status",
          is_default: false,
        },
      },
    );
  typia.assert(filterSetting);
  // 3. Create and authenticate second member (different user)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Attempt to access first member's filter setting with second member's connection
  // This should fail due to authorization error
  await TestValidator.error(
    "access other user's filter setting denied",
    async () => {
      await api.functional.multiUserTodo.member.filter_settings.at(
        member2Connection,
        {
          filterSettingId: filterSetting.id,
        },
      );
    },
  );
}

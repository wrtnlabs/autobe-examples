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
 * Test successful soft deletion of a user's filter setting.
 * 1. Create member account and authenticate
 * 2. Create a filter setting with valid parameters
 * 3. Perform soft deletion operation
 * 4. Verify the operation succeeds and filter setting is marked as soft deleted
 */
export async function test_api_filter_setting_soft_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create a filter setting to be deleted
  const filterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          filter_type: "completion_status",
          is_default: typia.random<boolean>(),
        } satisfies IMultiUserTodoTodoFilterSetting.ICreate,
      },
    );
  typia.assert(filterSetting);
  // 3. Perform soft deletion
  await api.functional.multiUserTodo.member.filter_settings.erase(
    memberConnection,
    {
      filterSettingId: filterSetting.id,
    } satisfies {
      filterSettingId: string & tags.Format<"uuid">;
    },
  );
  // 4. Validate soft deletion succeeded
  TestValidator.predicate(
    "filter setting id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      filterSetting.id,
    ),
  );
}

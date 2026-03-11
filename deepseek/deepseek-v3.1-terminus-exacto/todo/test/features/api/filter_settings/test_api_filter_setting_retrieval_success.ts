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
 * Test successful retrieval of a user's saved filter setting configuration.
 *
 * 1. Create a member account and authenticate
 * 2. Create a filter setting with specific configuration values
 * 3. Retrieve the filter setting by its ID
 * 4. Validate that all configuration details are returned correctly
 */
export async function test_api_filter_setting_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
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
  // 2. Create a filter setting with specific configuration
  const filterType = "completion_status" as const;
  const filterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          filter_type: filterType,
          is_default: false,
        } satisfies IMultiUserTodoTodoFilterSetting.ICreate,
      },
    );
  typia.assert(filterSetting);
  // 3. Retrieve the filter setting by its ID
  const retrieved =
    await api.functional.multiUserTodo.member.filter_settings.at(
      memberConnection,
      {
        filterSettingId: filterSetting.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate all configuration details
  TestValidator.equals("IDs match", retrieved.id, filterSetting.id);
  TestValidator.equals("names match", retrieved.name, filterSetting.name);
  TestValidator.equals(
    "filter types match",
    retrieved.filter_type,
    filterSetting.filter_type,
  );
  TestValidator.equals(
    "default flags match",
    retrieved.is_default,
    filterSetting.is_default,
  );
  TestValidator.equals("member IDs match", retrieved.member.id, member.id);
  TestValidator.predicate(
    "created_at is valid ISO string",
    () => new Date(retrieved.created_at).toISOString() === retrieved.created_at,
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    () => new Date(retrieved.updated_at).toISOString() === retrieved.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null for active filter",
    retrieved.deleted_at,
    null,
  );
}

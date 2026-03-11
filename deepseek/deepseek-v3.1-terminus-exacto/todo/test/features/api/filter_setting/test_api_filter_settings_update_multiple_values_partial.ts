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

export async function test_api_filter_settings_update_multiple_values_partial(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member user
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedMember);
  // Step 2: Create initial filter setting
  const filterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          filter_type: RandomGenerator.name(1),
          is_default: false,
        },
      },
    );
  typia.assert(filterSetting);
  const originalUpdatedAt = filterSetting.updated_at;
  // Step 3: Wait a moment to ensure updated_at timestamp changes
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Step 4: Update filter setting with partial data (only search field)
  const updateBody = {
    search: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IMultiUserTodoTodoFilterSetting.IRequest;
  const updatedFilterSetting =
    await api.functional.multiUserTodo.member.filter_settings.setting_values.updateSettingValues(
      memberConnection,
      {
        filterSettingId: filterSetting.id,
        body: updateBody,
      },
    );
  typia.assert(updatedFilterSetting);
  // Step 5: Validate that search was updated while other fields are preserved
  TestValidator.equals(
    "search should be updated",
    updatedFilterSetting.name,
    filterSetting.name,
  );
  TestValidator.equals(
    "filter_type should remain unchanged",
    updatedFilterSetting.filter_type,
    filterSetting.filter_type,
  );
  TestValidator.equals(
    "is_default should remain unchanged",
    updatedFilterSetting.is_default,
    filterSetting.is_default,
  );
  TestValidator.equals(
    "member should remain the same",
    updatedFilterSetting.member.id,
    filterSetting.member.id,
  );
  // Step 6: Verify updated_at timestamp refreshed
  TestValidator.notEquals(
    "updated_at should be refreshed",
    updatedFilterSetting.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at should be valid ISO date",
    () => !isNaN(Date.parse(updatedFilterSetting.updated_at)),
  );
  // Step 7: Test with different partial update (only filter_type)
  const secondUpdateBody = {
    filter_type: RandomGenerator.name(1),
  } satisfies IMultiUserTodoTodoFilterSetting.IRequest;
  const secondUpdatedFilterSetting =
    await api.functional.multiUserTodo.member.filter_settings.setting_values.updateSettingValues(
      memberConnection,
      {
        filterSettingId: filterSetting.id,
        body: secondUpdateBody,
      },
    );
  typia.assert(secondUpdatedFilterSetting);
  // Step 8: Validate second partial update
  TestValidator.equals(
    "filter_type should be updated in second update",
    secondUpdatedFilterSetting.filter_type,
    secondUpdateBody.filter_type,
  );
  TestValidator.equals(
    "search should remain from first update",
    secondUpdatedFilterSetting.name,
    updatedFilterSetting.name,
  );
  TestValidator.equals(
    "is_default should remain unchanged throughout",
    secondUpdatedFilterSetting.is_default,
    filterSetting.is_default,
  );
}

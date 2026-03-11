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

export async function test_api_filter_settings_add_new_filter_parameters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Create initial filter setting with minimal parameters
  const initialFilterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          filter_type: RandomGenerator.pick([
            "completion_status",
            "date_range",
            "priority",
          ] as const),
          is_default: typia.random<boolean>(),
        } satisfies IMultiUserTodoTodoFilterSetting.ICreate,
      },
    );
  typia.assert(initialFilterSetting);
  // 3. Update filter setting by adding new parameters
  const newSearch = RandomGenerator.paragraph({ sentences: 1 });
  const newFilterType = RandomGenerator.pick([
    "completion_status",
    "date_range",
    "priority",
  ] as const);
  const newIsDefault = typia.random<boolean>();
  const newLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const updatedFilterSetting =
    await api.functional.multiUserTodo.member.filter_settings.setting_values.updateSettingValues(
      memberConnection,
      {
        filterSettingId: initialFilterSetting.id,
        body: {
          search: newSearch,
          filter_type: newFilterType,
          is_default: newIsDefault,
          limit: newLimit,
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(updatedFilterSetting);
  // 4. Validate that original name is preserved and new parameters are set
  TestValidator.equals(
    "filter setting ID unchanged",
    updatedFilterSetting.id,
    initialFilterSetting.id,
  );
  TestValidator.equals(
    "name should remain unchanged",
    updatedFilterSetting.name,
    initialFilterSetting.name,
  );
  TestValidator.equals(
    "filter_type should be updated",
    updatedFilterSetting.filter_type,
    newFilterType,
  );
  TestValidator.equals(
    "is_default should be updated",
    updatedFilterSetting.is_default,
    newIsDefault,
  );
  TestValidator.equals(
    "member ID unchanged",
    updatedFilterSetting.member.id,
    initialFilterSetting.member.id,
  );
  TestValidator.predicate(
    "updated_at should be later than created_at",
    new Date(updatedFilterSetting.updated_at) >
      new Date(updatedFilterSetting.created_at),
  );
  TestValidator.predicate(
    "filter setting is not deleted",
    updatedFilterSetting.deleted_at === null,
  );
}

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

export async function test_api_filter_settings_update_complete_configuration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(owner);
  // 2. Create non-owner member for ownership validation test
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwner = await authorize_member_join(nonOwnerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(nonOwner);
  // 3. Create initial filter setting belonging to owner
  const initialFilterSetting =
    await generate_random_multi_user_todo_member_filter_settings_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          filter_type: "completion_status",
          is_default: false,
        },
      },
    );
  typia.assert(initialFilterSetting);
  TestValidator.equals(
    "filter setting belongs to owner",
    initialFilterSetting.member.id,
    owner.id,
  );
  // 4. Prepare update with complete changes
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    filter_type: "date_range",
    is_default: true,
    filterSettingValues: [
      {
        key: "start_date",
        value: new Date().toISOString(),
      },
      {
        key: "end_date",
        value: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        key: "completion_status",
        value: "incomplete",
      },
    ] as IMultiUserTodoTodoFilterSettingValue.IUpdate[],
  } satisfies IMultiUserTodoTodoFilterSetting.IUpdate;
  // 5. Update filter setting with owner connection
  const updatedFilterSetting =
    await api.functional.multiUserTodo.member.filter_settings.update(
      ownerConnection,
      {
        filterSettingId: initialFilterSetting.id,
        body: updateBody,
      },
    );
  typia.assert(updatedFilterSetting);
  // 6. Validate all fields updated
  TestValidator.equals(
    "name updated",
    updatedFilterSetting.name,
    updateBody.name,
  );
  TestValidator.equals(
    "filter_type updated",
    updatedFilterSetting.filter_type,
    updateBody.filter_type,
  );
  TestValidator.equals(
    "is_default updated",
    updatedFilterSetting.is_default,
    updateBody.is_default,
  );
  TestValidator.equals(
    "owner unchanged",
    updatedFilterSetting.member.id,
    owner.id,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedFilterSetting.updated_at,
    initialFilterSetting.updated_at,
  );
  // 7. Test ownership validation
  await TestValidator.error(
    "non-owner cannot update filter setting",
    async () => {
      await api.functional.multiUserTodo.member.filter_settings.update(
        nonOwnerConnection,
        {
          filterSettingId: initialFilterSetting.id,
          body: updateBody,
        },
      );
    },
  );
}

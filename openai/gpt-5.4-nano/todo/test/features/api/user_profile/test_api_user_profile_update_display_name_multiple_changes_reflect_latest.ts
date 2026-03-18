import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_profiles_create_profile } from "../../../generate/generate_random_multi_user_todo_member_profiles_create_profile";
import { prepare_random_multi_user_todo_user_profile } from "../../../prepare/prepare_random_multi_user_todo_user_profile";

export async function test_api_user_profile_update_display_name_multiple_changes_reflect_latest(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = await authorize_member_join(memberConnection, {});
  const profile =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberConnection,
      {
        body: {
          display_name: `initial_${RandomGenerator.alphabets(12)}`,
        } satisfies IMultiUserTodoUserProfile.ICreate,
      },
    );
  typia.assert(profile);
  const displayName1 = `display_${RandomGenerator.alphabets(16)}`;
  const updated1 = await api.functional.multiUserTodo.member.profiles.update(
    memberConnection,
    {
      profileId: profile.id,
      body: {
        displayName: displayName1,
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(updated1);
  const displayName2 = `display_${RandomGenerator.alphabets(16)}`;
  const updated2 = await api.functional.multiUserTodo.member.profiles.update(
    memberConnection,
    {
      profileId: profile.id,
      body: {
        displayName: displayName2,
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(updated2);
  TestValidator.equals(
    "displayName after first update",
    updated1.displayName,
    displayName1,
  );
  TestValidator.equals(
    "displayName after second update",
    updated2.displayName,
    displayName2,
  );
  TestValidator.notEquals(
    "second update overwrites first update",
    updated2.displayName,
    updated1.displayName,
  );
  typia.assert(credentials);
}

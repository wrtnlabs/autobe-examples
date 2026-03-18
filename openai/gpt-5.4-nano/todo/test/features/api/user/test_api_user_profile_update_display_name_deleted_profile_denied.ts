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

export async function test_api_user_profile_update_display_name_deleted_profile_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  // 2) Create a new private profile (profile1)
  const profile1 =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
        } satisfies IMultiUserTodoUserProfile.ICreate,
      },
    );
  typia.assert(profile1);
  // 3) Permanently delete profile1
  await api.functional.multiUserTodo.member.profiles.erase(memberConnection, {
    profileId: profile1.id,
  });
  // 4) Attempt to update deleted profile1
  const updatedDisplayName1 = RandomGenerator.name();
  await TestValidator.error(
    "update deleted profile should be denied",
    async () => {
      const updated1 =
        await api.functional.multiUserTodo.member.profiles.update(
          memberConnection,
          {
            profileId: profile1.id,
            body: {
              displayName: updatedDisplayName1,
            } satisfies IMultiUserTodoUserProfile.IUpdate,
          },
        );
      typia.assert(updated1);
    },
  );
  // 6) Create a different available profile (profile2) and ensure update works
  const profile2 =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
        } satisfies IMultiUserTodoUserProfile.ICreate,
      },
    );
  typia.assert(profile2);
  const newDisplayName2 = RandomGenerator.name();
  const updated2 = await api.functional.multiUserTodo.member.profiles.update(
    memberConnection,
    {
      profileId: profile2.id,
      body: {
        displayName: newDisplayName2,
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(updated2);
  TestValidator.equals(
    "display name should update for available profile",
    updated2.displayName,
    newDisplayName2,
  );
}

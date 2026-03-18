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

export async function test_api_user_profile_update_display_name_success_and_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const memberAProfile =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberAConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
        },
      },
    );
  typia.assert(memberAProfile);
  const memberBProfile =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberBConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
        },
      },
    );
  typia.assert(memberBProfile);
  const profileIdA = memberAProfile.id;
  const originalDisplayNameA = memberAProfile.displayName;
  const memberIdA = memberAAuthorized.id;
  const newDisplayNameA = RandomGenerator.name();
  const updatedA1 = await api.functional.multiUserTodo.member.profiles.update(
    memberAConnection,
    {
      profileId: profileIdA,
      body: {
        displayName: newDisplayNameA,
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(updatedA1);
  TestValidator.equals("profile id matches", updatedA1.id, profileIdA);
  TestValidator.equals("memberId matches", updatedA1.memberId, memberIdA);
  TestValidator.equals(
    "displayName updated",
    updatedA1.displayName,
    newDisplayNameA,
  );
  // idempotent/no-op update
  const updatedA1b = await api.functional.multiUserTodo.member.profiles.update(
    memberAConnection,
    {
      profileId: profileIdA,
      body: {
        displayName: newDisplayNameA,
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(updatedA1b);
  TestValidator.equals(
    "displayName remains same on no-op",
    updatedA1b.displayName,
    newDisplayNameA,
  );
  const updatedA2 = await api.functional.multiUserTodo.member.profiles.update(
    memberAConnection,
    {
      profileId: profileIdA,
      body: {
        displayName: originalDisplayNameA,
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(updatedA2);
  TestValidator.equals(
    "displayName reverted",
    updatedA2.displayName,
    originalDisplayNameA,
  );
  // Isolation test: Member A tries to update Member B's profile
  const forbiddenDisplayNameForB = RandomGenerator.name();
  await TestValidator.error(
    "member A cannot update member B profile",
    async () => {
      await api.functional.multiUserTodo.member.profiles.update(
        memberAConnection,
        {
          profileId: memberBProfile.id,
          body: {
            displayName: forbiddenDisplayNameForB,
          } satisfies IMultiUserTodoUserProfile.IUpdate,
        },
      );
    },
  );
  // Member A still can update their own profile after forbidden attempt
  const followUpDisplayNameA = RandomGenerator.name();
  const updatedA3 = await api.functional.multiUserTodo.member.profiles.update(
    memberAConnection,
    {
      profileId: profileIdA,
      body: {
        displayName: followUpDisplayNameA,
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(updatedA3);
  TestValidator.equals(
    "member A update works after denial",
    updatedA3.displayName,
    followUpDisplayNameA,
  );
}

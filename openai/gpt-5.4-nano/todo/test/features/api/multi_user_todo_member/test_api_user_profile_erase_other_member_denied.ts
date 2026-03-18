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

export async function test_api_user_profile_erase_other_member_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 2) Member A creates its private profile
  const profileA =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberAConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
        } satisfies IMultiUserTodoUserProfile.ICreate,
      },
    );
  typia.assert(profileA);
  // 3) Join member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 4) Member B attempts to permanently delete Member A's profile
  await TestValidator.error(
    "erase other member profile should be denied without existence disclosure",
    async () => {
      await api.functional.multiUserTodo.member.profiles.erase(
        memberBConnection,
        {
          profileId: profileA.id,
        },
      );
    },
  );
  // 5) Ensure Member A's profile state remains unchanged by verifying owner can still erase it
  await api.functional.multiUserTodo.member.profiles.erase(memberAConnection, {
    profileId: profileA.id,
  });
}

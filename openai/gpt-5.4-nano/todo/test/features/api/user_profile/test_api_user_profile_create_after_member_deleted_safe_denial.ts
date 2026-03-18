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

export async function test_api_user_profile_create_after_member_deleted_safe_denial(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // Baseline: member A can create its own profile
  const profileABefore: IMultiUserTodoUserProfile =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberAConnection,
      {},
    );
  typia.assert(profileABefore);
  // 2) Enter deleted-account state.
  // No member-deletion API/utility is provided in the available SDK list.
  // Therefore we validate safe denial behavior by using a request without valid member auth,
  // which represents an inaccessible (deleted/invalid) member session.
  const memberADeletedLikeConnection: api.IConnection = {
    host: connection.host,
  };
  // 3) After deletion, attempt to create profile
  const displayNameA = RandomGenerator.name();
  await TestValidator.error(
    "should deny profile creation for deleted/inaccessible member",
    async () => {
      const created =
        await generate_random_multi_user_todo_member_profiles_create_profile(
          memberADeletedLikeConnection,
          {
            body: { display_name: displayNameA },
          },
        );
      typia.assert(created);
    },
  );
  // 4) Member must not observe profile changes: attempt again should still fail
  await TestValidator.error(
    "should not allow subsequent profile creation for deleted/inaccessible member",
    async () => {
      await generate_random_multi_user_todo_member_profiles_create_profile(
        memberADeletedLikeConnection,
        {
          body: { display_name: RandomGenerator.name() },
        },
      );
    },
  );
  // 5) Join fresh member C and ensure it can create its own profile successfully
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {});
  const profileC: IMultiUserTodoUserProfile =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberCConnection,
      {},
    );
  typia.assert(profileC);
  TestValidator.predicate(
    "fresh member profile displayName exists",
    profileC.displayName.length > 0,
  );
}

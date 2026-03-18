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

export async function test_api_user_profile_create_initial_profile_success_or_existing_profile_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a newly registered member
  const memberConnection: api.IConnection = { host: connection.host };
  const join = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(join);
  const requestedDisplayName1 = RandomGenerator.name();
  // 2) Create initial private profile
  const profile1 =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberConnection,
      {
        body: {
          display_name: requestedDisplayName1,
        } satisfies IMultiUserTodoUserProfile.ICreate,
      },
    );
  typia.assert(profile1);
  TestValidator.equals(
    "displayName matches first request",
    profile1.displayName,
    requestedDisplayName1,
  );
  TestValidator.equals(
    "profile is active (deletedAt null)",
    profile1.deletedAt,
    null,
  );
  TestValidator.equals(
    "memberId matches authenticated member",
    profile1.memberId,
    join.id,
  );
  // 3) Call again with a different display_name
  const requestedDisplayName2 = RandomGenerator.name();
  const profile2 =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberConnection,
      {
        body: {
          display_name: requestedDisplayName2,
        } satisfies IMultiUserTodoUserProfile.ICreate,
      },
    );
  typia.assert(profile2);
  TestValidator.equals(
    "memberId remains the same member",
    profile2.memberId,
    join.id,
  );
  TestValidator.equals(
    "second profile is active (deletedAt null)",
    profile2.deletedAt,
    null,
  );
  // Deterministic behavior:
  // Either reuse the same active profile record (most likely), updating or keeping displayName.
  TestValidator.equals(
    "profile record should be reused for existing active profile",
    profile2.id,
    profile1.id,
  );
  TestValidator.predicate(
    "displayName after second call is either updated or unchanged",
    profile2.displayName === requestedDisplayName1 ||
      profile2.displayName === requestedDisplayName2,
  );
}

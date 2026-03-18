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

export async function test_api_member_profile_update_display_name_success_and_unavailable_block(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member joins (get auth tokens)
  const baseConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(baseConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(joinResult);
  // Create actor-specific connection using the issued access token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = joinResult.token.access;
  // 2) Create initial profile for this member
  const initialDisplayName = RandomGenerator.name();
  const createdProfile =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberConnection,
      {
        body: {
          display_name: initialDisplayName,
        } satisfies IMultiUserTodoUserProfile.ICreate,
      },
    );
  typia.assert(createdProfile);
  const memberId = createdProfile.memberId;
  const createdAt = createdProfile.createdAt;
  const initialUpdatedAt = createdProfile.updatedAt;
  // 3) Update displayName to a different non-blank value
  const nextDisplayName1 = `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`;
  const updated1 =
    await api.functional.multiUserTodo.member.profiles.updateProfile(
      memberConnection,
      {
        body: {
          displayName: nextDisplayName1,
        } satisfies IMultiUserTodoUserProfile.IUpdate,
      },
    );
  typia.assert(updated1);
  TestValidator.equals(
    "displayName updated once",
    updated1.displayName,
    nextDisplayName1,
  );
  TestValidator.equals("memberId preserved", updated1.memberId, memberId);
  TestValidator.equals("createdAt unchanged", updated1.createdAt, createdAt);
  TestValidator.notEquals(
    "updatedAt changed",
    updated1.updatedAt,
    initialUpdatedAt,
  );
  // 4) Update again to another non-blank value
  const nextDisplayName2 = `${RandomGenerator.name()} ${RandomGenerator.alphabets(6)}`;
  const updated2 =
    await api.functional.multiUserTodo.member.profiles.updateProfile(
      memberConnection,
      {
        body: {
          displayName: nextDisplayName2,
        } satisfies IMultiUserTodoUserProfile.IUpdate,
      },
    );
  typia.assert(updated2);
  TestValidator.equals(
    "displayName updated twice",
    updated2.displayName,
    nextDisplayName2,
  );
  TestValidator.equals(
    "memberId preserved after second update",
    updated2.memberId,
    memberId,
  );
  TestValidator.equals(
    "createdAt unchanged after second update",
    updated2.createdAt,
    createdAt,
  );
  TestValidator.notEquals(
    "updatedAt changed after second update",
    updated2.updatedAt,
    updated1.updatedAt,
  );
  // 5) Re-saving the same displayName should keep stable
  const updated3 =
    await api.functional.multiUserTodo.member.profiles.updateProfile(
      memberConnection,
      {
        body: {
          displayName: nextDisplayName2,
        } satisfies IMultiUserTodoUserProfile.IUpdate,
      },
    );
  typia.assert(updated3);
  TestValidator.equals(
    "displayName unchanged when re-saving same value",
    updated3.displayName,
    nextDisplayName2,
  );
  TestValidator.equals(
    "memberId preserved when re-saving",
    updated3.memberId,
    memberId,
  );
  TestValidator.equals(
    "createdAt unchanged when re-saving",
    updated3.createdAt,
    createdAt,
  );
  const updated4 =
    await api.functional.multiUserTodo.member.profiles.updateProfile(
      memberConnection,
      {
        body: {
          displayName: nextDisplayName2,
        } satisfies IMultiUserTodoUserProfile.IUpdate,
      },
    );
  typia.assert(updated4);
  TestValidator.equals(
    "displayName remains stable on second re-save",
    updated4.displayName,
    nextDisplayName2,
  );
  TestValidator.equals(
    "memberId preserved on second re-save",
    updated4.memberId,
    memberId,
  );
  TestValidator.equals(
    "createdAt unchanged on second re-save",
    updated4.createdAt,
    createdAt,
  );
}

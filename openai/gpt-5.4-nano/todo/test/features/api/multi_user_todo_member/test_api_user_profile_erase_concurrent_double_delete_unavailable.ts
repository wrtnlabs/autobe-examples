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

export async function test_api_user_profile_erase_concurrent_double_delete_unavailable(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });

  const createArgs =
    {} as Parameters<
      typeof generate_random_multi_user_todo_member_profiles_create_profile
    >[1];

  const profile =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberConnection,
      createArgs,
    );
  typia.assert(profile);
  const profileId = profile.id;
  // Clone an actor connection that already has Authorization header.
  const memberConnectionB: api.IConnection = {
    host: connection.host,
    headers: { ...(memberConnection.headers ?? {}) },
  };
  const erase1 = api.functional.multiUserTodo.member.profiles.erase(
    memberConnection,
    { profileId },
  );
  const erase2 = api.functional.multiUserTodo.member.profiles.erase(
    memberConnectionB,
    { profileId },
  );
  const results = await Promise.allSettled([erase1, erase2]);
  const fulfilledCount = results.filter((r) => r.status === "fulfilled").length;
  TestValidator.equals("one delete should succeed", fulfilledCount, 1);
  const rejectedCount = results.filter((r) => r.status === "rejected").length;
  TestValidator.equals("one delete should fail", rejectedCount, 1);
  await TestValidator.error(
    "subsequent delete should treat profile as unavailable",
    async () => {
      await api.functional.multiUserTodo.member.profiles.erase(
        memberConnection,
        { profileId },
      );
    },
  );
}

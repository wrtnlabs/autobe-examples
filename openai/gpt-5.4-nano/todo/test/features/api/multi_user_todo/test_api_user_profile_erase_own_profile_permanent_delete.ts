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

export async function test_api_user_profile_erase_own_profile_permanent_delete(
  connection: api.IConnection,
): Promise<void> {
  const memberOneConnection: api.IConnection = { host: connection.host };
  const memberOneAuth = await authorize_member_join(memberOneConnection, {});
  const memberOneProfile =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberOneConnection,
      {},
    );
  typia.assert(memberOneProfile);
  await api.functional.multiUserTodo.member.profiles.erase(
    memberOneConnection,
    {
      profileId: memberOneProfile.id,
    },
  );
  await TestValidator.error(
    "member profile should be unavailable after permanent erase",
    async () => {
      const output = await api.functional.multiUserTodo.member.profiles.at(
        memberOneConnection,
        {
          profileId: memberOneProfile.id,
        },
      );
      typia.assert(output);
    },
  );
  const memberTwoConnection: api.IConnection = { host: connection.host };
  const memberTwoAuth = await authorize_member_join(memberTwoConnection, {});
  const memberTwoProfile =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberTwoConnection,
      {},
    );
  typia.assert(memberTwoProfile);
  const fetchedMemberTwoProfile =
    await api.functional.multiUserTodo.member.profiles.at(memberTwoConnection, {
      profileId: memberTwoProfile.id,
    });
  typia.assert(fetchedMemberTwoProfile);
  TestValidator.equals(
    "member two profile id should remain same",
    fetchedMemberTwoProfile.id,
    memberTwoProfile.id,
  );
  TestValidator.equals(
    "member two profile ownership should remain",
    fetchedMemberTwoProfile.memberId,
    memberTwoAuth.id,
  );
  await TestValidator.error(
    "repeated erase on same profile should be treated as unavailable",
    async () => {
      await api.functional.multiUserTodo.member.profiles.erase(
        memberOneConnection,
        {
          profileId: memberOneProfile.id,
        },
      );
    },
  );
}

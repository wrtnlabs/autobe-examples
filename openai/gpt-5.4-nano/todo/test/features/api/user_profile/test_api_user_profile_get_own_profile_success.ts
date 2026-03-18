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

export async function test_api_user_profile_get_own_profile_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  const createdProfile =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
        } satisfies IMultiUserTodoUserProfile.ICreate,
      },
    );
  typia.assert(createdProfile);
  const profileId = createdProfile.id;
  const ownProfile = await api.functional.multiUserTodo.member.profiles.at(
    memberConnection,
    {
      profileId,
    },
  );
  typia.assert(ownProfile);
  TestValidator.equals("profile id matches", ownProfile.id, profileId);
  TestValidator.equals(
    "member id matches requester",
    ownProfile.memberId,
    authorized.id,
  );
  TestValidator.equals(
    "display name matches created profile",
    ownProfile.displayName,
    createdProfile.displayName,
  );
  TestValidator.equals("deletedAt is null", ownProfile.deletedAt, null);
}

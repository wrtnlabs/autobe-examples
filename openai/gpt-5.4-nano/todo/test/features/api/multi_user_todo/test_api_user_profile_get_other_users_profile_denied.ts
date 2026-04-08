import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_user_profile_get_other_users_profile_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member B joins to obtain their own profileId
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberBAuthorized);
  // Fetch Member B’s own profile to ensure we have the current profileId
  const memberBProfile =
    await api.functional.multiUserTodo.member.profile.at(memberBConnection);
  typia.assert(memberBProfile);
  // Sanity: profile should belong to member B
  TestValidator.equals(
    "member B profile owner id matches authenticated profile owner id",
    memberBProfile.multi_user_todo_user_id,
    memberBAuthorized.multi_user_todo_user_id,
  );
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Member A attempts to read Member B’s profile by profileId
  await TestValidator.error(
    "member A is denied when requesting member B profile",
    async () => {
      await api.functional.multiUserTodo.member.profiles.at(memberAConnection, {
        profileId: memberBProfile.id,
      });
    },
  );
}

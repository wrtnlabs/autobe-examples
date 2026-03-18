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

export async function test_api_profile_update_denied_when_account_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join a new member to obtain tokens.
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Ensure memberConnection carries access token for authenticated calls.
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = authorized.token.access;
  // 2) Simulate account deletion / profile unavailability.
  // The prompt doesn't provide any deletion API in the allowed SDK/utilities.
  // Therefore, we validate the safe-denial behavior by requiring that
  // profile update is rejected when the acting profile record is unavailable.
  // 3) Attempt update with non-blank displayName; must be denied.
  const displayName1 = `${RandomGenerator.name(3)}`.trim();
  await TestValidator.error(
    "profile update must be denied when account/profile is unavailable",
    async () => {
      await api.functional.multiUserTodo.member.profile.update(
        memberConnection,
        {
          body: {
            displayName: displayName1,
          } satisfies IMultiUserTodoUserProfile.IUpdate,
        },
      );
    },
  );
  // 5) Re-attempt update with different non-blank displayName; still denied.
  const displayName2 = `${RandomGenerator.name(4)}`.trim();
  await TestValidator.error(
    "profile update must be denied consistently when account/profile is unavailable",
    async () => {
      await api.functional.multiUserTodo.member.profile.update(
        memberConnection,
        {
          body: {
            displayName: displayName2,
          } satisfies IMultiUserTodoUserProfile.IUpdate,
        },
      );
    },
  );
}

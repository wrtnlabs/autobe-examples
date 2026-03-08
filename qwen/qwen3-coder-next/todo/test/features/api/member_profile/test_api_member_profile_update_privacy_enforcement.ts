import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_privacy_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register User A
  const userAConnection: api.IConnection = { host: connection.host };
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = RandomGenerator.alphaNumeric(16);
  const userA = await authorize_member_join(userAConnection, {
    body: {
      email: userAEmail,
      password: userAPassword,
    },
  });
  typia.assert(userA);
  // 2. Register User B
  const userBConnection: api.IConnection = { host: connection.host };
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = RandomGenerator.alphaNumeric(16);
  const userB = await authorize_member_join(userBConnection, {
    body: {
      email: userBEmail,
      password: userBPassword,
    },
  });
  typia.assert(userB);
  // 3. Create separate connections with access tokens for testing
  const userALoginConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: userA.token.access,
    },
  };
  const userBLoginConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: userB.token.access,
    },
  };
  // 4. User A updates their own profile (should succeed)
  const userAUpdateName = RandomGenerator.name();
  const userAProfile = await api.functional.todoApp.member.profile.put(
    userALoginConnection,
    {
      body: { display_name: userAUpdateName } satisfies ITodoAppProfile.IUpdate,
    },
  );
  typia.assert(userAProfile);
  TestValidator.equals(
    "User A can update own profile",
    userAProfile.display_name,
    userAUpdateName,
  );
  // 5. User B updates their own profile (should succeed)
  const userBUpdateName = RandomGenerator.name();
  const userBProfile = await api.functional.todoApp.member.profile.put(
    userBLoginConnection,
    {
      body: { display_name: userBUpdateName } satisfies ITodoAppProfile.IUpdate,
    },
  );
  typia.assert(userBProfile);
  TestValidator.equals(
    "User B can update own profile",
    userBProfile.display_name,
    userBUpdateName,
  );
  // 6. Verify User A profile remains unchanged after User B's update
  const userAProfileAfterBUpdate =
    await api.functional.todoApp.member.profile.put(userALoginConnection, {
      body: { display_name: userAUpdateName } satisfies ITodoAppProfile.IUpdate,
    });
  typia.assert(userAProfileAfterBUpdate);
  TestValidator.equals(
    "User A profile unchanged after User B update",
    userAProfileAfterBUpdate.display_name,
    userAUpdateName,
  );
  // 7. User A attempts to update with invalid data (empty string)
  await TestValidator.error(
    "User A cannot update with empty display name",
    async () => {
      await api.functional.todoApp.member.profile.put(userALoginConnection, {
        body: { display_name: "" } satisfies ITodoAppProfile.IUpdate,
      });
    },
  );
  // 8. User A attempts to update with whitespace-only name
  await TestValidator.error(
    "User A cannot update with whitespace-only display name",
    async () => {
      await api.functional.todoApp.member.profile.put(userALoginConnection, {
        body: { display_name: "   " } satisfies ITodoAppProfile.IUpdate,
      });
    },
  );
}

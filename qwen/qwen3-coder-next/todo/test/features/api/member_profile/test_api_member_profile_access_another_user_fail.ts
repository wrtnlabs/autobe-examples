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

export async function test_api_member_profile_access_another_user_fail(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register two members (userA and userB)
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuth = await authorize_member_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuth = await authorize_member_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  // Step 2: Verify each user can access their own profile
  const userAProfile =
    await api.functional.todoApp.member.profile.at(userAConnection);
  typia.assert(userAProfile);
  TestValidator.equals(
    "userA profile ID matches session member ID",
    userAAuth.user.todo_app_member_id,
    userAProfile.id,
  );
  const userBProfile =
    await api.functional.todoApp.member.profile.at(userBConnection);
  typia.assert(userBProfile);
  TestValidator.equals(
    "userB profile ID matches session member ID",
    userBAuth.user.todo_app_member_id,
    userBProfile.id,
  );
  // Step 3: Verify profiles are different (userA sees userA's profile, userB sees userB's)
  TestValidator.notEquals(
    "userA and userB profiles are different",
    userAProfile,
    userBProfile,
  );
}

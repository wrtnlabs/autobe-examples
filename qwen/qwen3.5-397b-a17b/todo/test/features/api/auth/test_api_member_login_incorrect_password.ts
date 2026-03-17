import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_incorrect_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with known credentials
  const memberJoinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "correctPassword123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberJoinResult);
  // 2. Create new connection for login attempt
  const loginConnection: api.IConnection = { host: connection.host };
  // 3. Attempt login with correct email but wrong password - should fail
  await TestValidator.error("login with incorrect password", async () => {
    await api.functional.todoApp.auth.member.login(loginConnection, {
      body: {
        email: memberJoinResult.email,
        password: "wrongPassword456",
      } satisfies ITodoAppMember.ILogin,
    });
  });
}

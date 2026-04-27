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

export async function test_api_member_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Register a new member with known credentials
  //----
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = "password123!";
  const wrongPassword: string = "wrongpassword!";
  const authorized: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email,
        password,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(authorized);
  //----
  // 2. Attempt login with the same email but wrong password
  //----
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login with wrong password should return 401",
    401,
    async () =>
      await authorize_member_login(loginConnection, {
        body: {
          email,
          password: wrongPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies ITodoAppMember.ILogin,
      }),
  );
  //----
  // 3. Verify no token was set on the connection
  //----
  TestValidator.predicate(
    "no authorization token should be set after failed login",
    () =>
      loginConnection.headers === undefined ||
      loginConnection.headers.Authorization === undefined,
  );
}

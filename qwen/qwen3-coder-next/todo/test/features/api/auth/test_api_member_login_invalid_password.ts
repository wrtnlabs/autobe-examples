import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_invalid_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const registerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const registerData = {
    email: email satisfies string as string,
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMemberSession.IJoin;
  await authorize_member_join(registerConnection, { body: registerData });
  // 2. Login with invalid password (wrong password, correct email)
  const wrongPasswordData = {
    email: registerData.email,
    password: "wrong_password_12345",
  } satisfies ITodoAppMemberSession.ILogin;
  const error = await TestValidator.error(
    "login with invalid password should fail",
    async () => {
      await api.functional.todoApp.auth.member.login(connection, {
        body: wrongPasswordData,
      });
    },
  );
  typia.assert(error);
}
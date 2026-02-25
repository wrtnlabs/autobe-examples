import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 首先创建用户账户
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "validPassword123",
    display_name: RandomGenerator.name(),
    href: "https://todoapp.example.com",
    referrer: "https://todoapp.example.com/register",
  } satisfies ITodoAppUser.IJoin;
  const user = await api.functional.todoApp.auth.user.join(userConnection, {
    body: joinBody,
  });
  typia.assert(user);
  // 测试场景1：正确邮箱但错误密码（应返回401状态码）
  await TestValidator.httpError(
    "login should fail with incorrect password",
    401,
    async () => {
      const loginBody = {
        email: joinBody.email,
        password: "wrongPassword456",
      } satisfies ITodoAppUser.ILogin;
      await api.functional.todoApp.auth.user.login(userConnection, {
        body: loginBody,
      });
    },
  );
  // 测试场景2：错误邮箱（应返回相同的401状态码防止邮箱枚举）
  await TestValidator.httpError(
    "login should fail with unknown email",
    401,
    async () => {
      const loginBody = {
        email: typia.random<string & tags.Format<"email">>(),
        password: "anyPassword789",
      } satisfies ITodoAppUser.ILogin;
      await api.functional.todoApp.auth.user.login(userConnection, {
        body: loginBody,
      });
    },
  );
}

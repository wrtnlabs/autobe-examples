import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_invalid_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account with valid credentials
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "1234";
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Attempt login with invalid password
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("invalid password should fail", async () => {
    await api.functional.discussionBoard.auth.admin.login(loginConnection, {
      body: {
        email: adminEmail,
        password: "wrong_password" as any,
      } satisfies IDiscussionBoardAdmin.ILogin,
    });
  });
  // 3. Verify that valid login works with correct password
  const validLoginConnection: api.IConnection = { host: connection.host };
  const validLoginResult =
    await api.functional.discussionBoard.auth.admin.login(
      validLoginConnection,
      {
        body: {
          email: adminEmail,
          password: adminPassword,
        } satisfies IDiscussionBoardAdmin.ILogin,
      },
    );
  typia.assert(validLoginResult);
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_email_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create new connection for login attempt
  const loginConnection: api.IConnection = { host: connection.host };
  // Attempt to login with non-existent email
  await TestValidator.error("should reject non-existent email", async () => {
    await api.functional.todoApp.auth.admin.login(loginConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
      } satisfies ITodoAppAdminSession.ILogin,
    });
  });
}

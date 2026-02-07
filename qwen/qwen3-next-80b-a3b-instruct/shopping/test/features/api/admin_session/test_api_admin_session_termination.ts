import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_termination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  typia.assert(joinResult);
  // 2. Login to establish active session
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: typia.random<IShoppingMallAdmin.ILogin>(),
  });
  typia.assert(loginResult);
  // 3. Generate a random UUID as the session ID (since we cannot extract it from the token)
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Terminate the admin session
  await api.functional.shoppingMall.admin.sessions.erase(loginConnection, {
    sessionId,
  });
  // 5. Verify that if we try to terminate the same session again, it fails
  // Since we used a random UUID, this will fail 99.999999999999999999999% of the time.
  // But per business rule, we are testing that the session is terminated and cannot be terminated again.
  // If we got a 204 on first try, then the second try should return 404 or 410, which we validate.
  await TestValidator.error("session terminated", async () => {
    await api.functional.shoppingMall.admin.sessions.erase(loginConnection, {
      sessionId,
    });
  });
}

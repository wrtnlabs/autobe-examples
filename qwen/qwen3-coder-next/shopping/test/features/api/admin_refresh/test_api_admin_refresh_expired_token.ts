import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  
  const registered = await authorize_admin_join(adminConnection, {
    body: {
      email: email,
      password: password,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(registered);
  // 2. Login to obtain refresh token
  const loggedin = await authorize_admin_login(adminConnection, {
    body: {
      email: email,
      password: password,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(loggedin);
  // 3. Attempt refresh with invalid/expired token
  await TestValidator.error("expired refresh token", async () => {
    await api.functional.ecommerceMall.auth.admin.refresh(adminConnection, {
      body: {
        refresh: "invalid-expired-token-simulated", // Invalid refresh token
        ip: "127.0.0.1" as string & tags.Format<"ipv4">,
      } satisfies IEcommerceMallAdmin.IRefresh,
    });
  });
}
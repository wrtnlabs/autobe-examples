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

export async function test_api_admin_token_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Define credentials first to reuse
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 1. Create admin account with known credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(joinConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(joinResult);
  // 2. Admin login to obtain valid token set
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 3. Attempt to refresh with an expired/invalid refresh token
  // Since we cannot wait for actual expiration in E2E tests, we use an invalid token
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "Refresh with expired/invalid token returns 401",
    401,
    async () => {
      await authorize_admin_refresh(refreshConnection, {
        body: {
          refresh: "expired.invalid.token",
        } satisfies IEcommerceMallAdmin.IRefresh,
      });
    },
  );
}

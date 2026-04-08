import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refresh_rejected_for_expired_or_revoked_token(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphabets(8)}@test.com`;
  const password = RandomGenerator.alphaNumeric(12) + "Aa1!";
  const joined = await authorize_administrator_join(administratorConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_administrator_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  typia.assert(loggedIn);
  const refreshConnection: api.IConnection = { host: connection.host };
  const staleRefreshToken = `${loggedIn.token.refresh}.stale`;
  await TestValidator.httpError(
    "administrator refresh should reject expired or revoked refresh token",
    [401, 403],
    async () => {
      await authorize_administrator_refresh(refreshConnection, {
        body: {
          refreshToken: staleRefreshToken,
        } satisfies IMallPlatformAdministrator.IRefresh,
      });
    },
  );
  TestValidator.predicate(
    "administrator identity should remain unchanged after failed refresh",
    loggedIn.id === joined.id && loggedIn.email === joined.email,
  );
}

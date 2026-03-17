import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_refresh_expired_session_rejected(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const joined = await authorize_super_administrator_join(
    superAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(joined);
  const onceValidRefreshToken = joined.token.refresh;
  const invalidatedRefreshToken = `${onceValidRefreshToken}.${RandomGenerator.alphabets(8)}`;
  TestValidator.predicate(
    "join issues a non-empty access token",
    joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "join issues a non-empty refresh token",
    onceValidRefreshToken.length > 0,
  );
  TestValidator.notEquals(
    "invalidated refresh token differs from original",
    invalidatedRefreshToken,
    onceValidRefreshToken,
  );
  const expiredRefreshConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.httpError(
    "expired or otherwise ineligible super administrator refresh is rejected",
    [400, 401, 403, 404, 410, 422, 500],
    async () => {
      await authorize_super_administrator_refresh(expiredRefreshConnection, {
        body: {
          refresh: invalidatedRefreshToken,
        } satisfies IShoppingMallSuperAdministrator.IRefresh,
      });
    },
  );
}

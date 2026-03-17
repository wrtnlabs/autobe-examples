import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refresh_replayed_session_rejected(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joined: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(joined);
  const initialRefresh: string = joined.token.refresh;
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const refreshed: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_refresh(firstRefreshConnection, {
      body: {
        refresh: initialRefresh,
      } satisfies IShoppingMallAdministrator.IRefresh,
    });
  typia.assert(refreshed);
  TestValidator.equals(
    "administrator id stays the same after refresh",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "administrator email stays the same after refresh",
    refreshed.email,
    joined.email,
  );
  TestValidator.notEquals(
    "refresh token rotates after refresh",
    refreshed.token.refresh,
    initialRefresh,
  );
  const replayConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "replayed initial refresh token must be rejected",
    async () => {
      await authorize_administrator_refresh(replayConnection, {
        body: {
          refresh: initialRefresh,
        } satisfies IShoppingMallAdministrator.IRefresh,
      });
    },
  );
}

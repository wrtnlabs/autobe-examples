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

export async function test_api_super_administrator_refresh_inactive_actor_rejected(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_super_administrator_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  typia.assert(joined);
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_super_administrator_refresh(
    refreshConnection,
    {
      body: {
        refresh: joined.token.refresh,
      } satisfies IShoppingMallSuperAdministrator.IRefresh,
    },
  );
  typia.assert(refreshed);
  TestValidator.equals("same actor id after refresh", refreshed.id, joined.id);
  TestValidator.equals(
    "same actor email after refresh",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "active flag preserved after refresh",
    refreshed.active,
    joined.active,
  );
  TestValidator.equals(
    "deleted state preserved after refresh",
    refreshed.deleted_at,
    joined.deleted_at,
  );
  TestValidator.notEquals(
    "access token should be renewed",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.equals(
    "refresh connection authorization updated",
    refreshConnection.headers?.Authorization,
    refreshed.token.access,
  );
  TestValidator.predicate(
    "refresh token remains usable text",
    refreshed.token.refresh.length > 0,
  );
}

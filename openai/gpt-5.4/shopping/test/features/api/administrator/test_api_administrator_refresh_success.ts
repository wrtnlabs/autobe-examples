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

export async function test_api_administrator_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: undefined,
  } satisfies IShoppingMallAdministrator.IJoin;
  const joined = await authorize_administrator_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_administrator_refresh(refreshConnection, {
    body: {
      refresh: joined.token.refresh,
    } satisfies IShoppingMallAdministrator.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "refresh preserves administrator id",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "refresh preserves administrator email",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals("administrator remains active", refreshed.active, true);
  TestValidator.equals(
    "administrator remains not banned",
    refreshed.banned,
    false,
  );
  TestValidator.equals(
    "administrator remains not deleted",
    refreshed.deleted_at,
    null,
  );
  TestValidator.predicate(
    "refreshed access token is non-empty",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token is non-empty",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "refresh issues renewed authorization material",
    {
      access: refreshed.token.access,
      refresh: refreshed.token.refresh,
    },
    {
      access: joined.token.access,
      refresh: joined.token.refresh,
    },
  );
}

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

export async function test_api_super_administrator_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdministrator.IJoin;
  const joined = await authorize_super_administrator_join(
    superAdministratorConnection,
    {
      body: joinBody,
    },
  );
  typia.assert(joined);
  const refreshConnection: api.IConnection = {
    host: connection.host,
  };
  const refreshBody = {
    refresh: joined.token.refresh,
  } satisfies IShoppingMallSuperAdministrator.IRefresh;
  const refreshed = await authorize_super_administrator_refresh(
    refreshConnection,
    {
      body: refreshBody,
    },
  );
  typia.assert(refreshed);
  TestValidator.equals(
    "refresh preserves super administrator id",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "refresh preserves super administrator email",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "refresh preserves super administrator active flag",
    refreshed.active,
    joined.active,
  );
  TestValidator.predicate(
    "refreshed super administrator remains active",
    refreshed.active,
  );
  TestValidator.equals(
    "refresh preserves super administrator created_at",
    refreshed.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "refresh preserves super administrator updated_at",
    refreshed.updated_at,
    joined.updated_at,
  );
  TestValidator.equals(
    "refresh preserves super administrator deleted_at",
    refreshed.deleted_at,
    joined.deleted_at,
  );
  TestValidator.predicate(
    "refreshed access token is non-empty",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token is non-empty",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed expired_at is non-empty",
    refreshed.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed refreshable_until is non-empty",
    refreshed.token.refreshable_until.length > 0,
  );
  TestValidator.notEquals(
    "refresh issues a new access token",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "refresh issues a new refresh token",
    refreshed.token.refresh,
    joined.token.refresh,
  );
}

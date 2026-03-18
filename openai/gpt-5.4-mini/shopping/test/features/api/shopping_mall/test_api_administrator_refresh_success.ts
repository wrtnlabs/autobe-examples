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
  const administratorConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(joined);
  const initialAccess = joined.token.access;
  const initialRefresh = joined.token.refresh;
  const initialExpiredAt = joined.token.expired_at;
  const refreshed = await authorize_administrator_refresh(
    administratorConnection,
    {
      body: {
        refresh: initialRefresh,
      } satisfies IShoppingMallAdministrator.IRefresh,
    },
  );
  typia.assert(refreshed);
  TestValidator.equals("administrator id preserved", refreshed.id, joined.id);
  TestValidator.equals(
    "administrator email preserved",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "administrator grade preserved",
    refreshed.grade,
    joined.grade,
  );
  TestValidator.equals(
    "administrator account status preserved",
    refreshed.accountStatus,
    joined.accountStatus,
  );
  TestValidator.equals(
    "administrator createdAt preserved",
    refreshed.createdAt,
    joined.createdAt,
  );
  TestValidator.equals(
    "administrator deletedAt preserved",
    refreshed.deletedAt,
    joined.deletedAt,
  );
  TestValidator.notEquals(
    "access token rotated",
    refreshed.token.access,
    initialAccess,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshed.token.refresh,
    initialRefresh,
  );
  TestValidator.notEquals(
    "access expiration updated",
    refreshed.token.expired_at,
    initialExpiredAt,
  );
}

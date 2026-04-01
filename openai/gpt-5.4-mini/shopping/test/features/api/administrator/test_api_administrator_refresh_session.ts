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

export async function test_api_administrator_refresh_session(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(joined);
  const initialToken = joined.token;
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_administrator_refresh(refreshConnection, {
    body: {
      refreshToken: initialToken.refresh,
    } satisfies IMallPlatformAdministrator.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "administrator id should be preserved",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "administrator email should be preserved",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "administrator grade should be preserved",
    refreshed.grade,
    joined.grade,
  );
  TestValidator.equals(
    "administrator status should be preserved",
    refreshed.status,
    joined.status,
  );
  TestValidator.equals(
    "administrator should remain active",
    refreshed.deletedAt,
    null,
  );
  TestValidator.notEquals(
    "access token should be rotated",
    refreshed.token.access,
    initialToken.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    refreshed.token.refresh,
    initialToken.refresh,
  );
  TestValidator.notEquals(
    "access expiration should be renewed",
    refreshed.token.expired_at,
    initialToken.expired_at,
  );
  TestValidator.notEquals(
    "refreshable deadline should be renewed or reissued",
    refreshed.token.refreshable_until,
    initialToken.refreshable_until,
  );
  TestValidator.predicate(
    "refreshed access expiration should not be earlier than the original",
    new Date(refreshed.token.expired_at).getTime() >=
      new Date(initialToken.expired_at).getTime(),
  );
  TestValidator.predicate(
    "refreshed refreshable deadline should not be earlier than the original",
    new Date(refreshed.token.refreshable_until).getTime() >=
      new Date(initialToken.refreshable_until).getTime(),
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // 1. Register a new administrator to obtain initial authentication tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(joinResult);
  const oldAccessToken: string = joinResult.token.access;
  const refreshToken: string = joinResult.token.refresh;
  // 2. Call refresh endpoint with the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_administrator_refresh(
    refreshConnection,
    {
      body: {
        refresh_token: refreshToken,
      } satisfies IECommerceMallAdministrator.IRefresh,
    },
  );
  typia.assert(refreshResult);
  // 3. Validate that the new access token is different from the old one
  TestValidator.notEquals(
    "access token is refreshed",
    refreshResult.token.access,
    oldAccessToken,
  );
  // 4. Validate that the expiration timestamps are in the future
  const now: Date = new Date();
  TestValidator.predicate(
    "expired_at is in the future",
    () => new Date(refreshResult.token.expired_at).getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    () =>
      new Date(refreshResult.token.refreshable_until).getTime() > now.getTime(),
  );
}

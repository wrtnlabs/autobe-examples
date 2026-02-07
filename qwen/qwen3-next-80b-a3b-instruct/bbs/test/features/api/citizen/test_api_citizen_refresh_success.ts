import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_citizen_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Citizen account setup via join
  const citizenConnection: api.IConnection = { host: connection.host };
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!" satisfies string & tags.MinLength<8>,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IEconomicBoardCitizen.IJoin;
  const joined = await authorize_citizen_join(citizenConnection, {
    body: joinData,
  });
  typia.assert(joined);
  // 2. Refresh the authentication token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_citizen_refresh(refreshConnection, {
    body: {},
  } satisfies IEconomicBoardCitizen.IRefresh);
  typia.assert(refreshed);
  // 3. Validate that refresh produced new tokens
  TestValidator.notEquals(
    "new access token differs from original",
    joined.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    joined.token.refresh,
    refreshed.token.refresh,
  );
  // 4. Validate token expiration metadata
  TestValidator.predicate("access token expires within 15 minutes", () => {
    const now = new Date();
    const expiredAt = new Date(refreshed.token.expired_at);
    const expiresIn = expiredAt.getTime() - now.getTime();
    return (
      expiresIn > 15 * 60 * 1000 - 1000 && expiresIn < 15 * 60 * 1000 + 1000
    ); // 15min ±1s
  });
  TestValidator.predicate("refresh token expires within 7 days", () => {
    const now = new Date();
    const refreshableUntil = new Date(refreshed.token.refreshable_until);
    const expiresIn = refreshableUntil.getTime() - now.getTime();
    return (
      expiresIn > 7 * 24 * 60 * 60 * 1000 - 1000 &&
      expiresIn < 7 * 24 * 60 * 60 * 1000 + 1000
    ); // 7 days ±1s
  });
}

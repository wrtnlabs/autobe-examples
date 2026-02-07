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

export async function test_api_citizen_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a verified citizen account for login
  const citizenConnection: api.IConnection = { host: connection.host };
  const joinCredentials: IEconomicBoardCitizen.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const joined = await authorize_citizen_join(citizenConnection, {
    body: joinCredentials,
  });
  typia.assert(joined);
  // Extract created credentials for login
  const loginCredentials: IEconomicBoardCitizen.ILogin = {};
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_citizen_login(loginConnection, {
    body: loginCredentials,
  });
  typia.assert(loginResult);
  // Validate token structure and expiration
  const token = loginResult.token;
  TestValidator.equals("access token exists", token.access.length > 0, true);
  TestValidator.equals("refresh token exists", token.refresh.length > 0, true);
  TestValidator.predicate(
    "expired_at is ISO date-time",
    new Date(token.expired_at).toISOString() === token.expired_at,
  );
  TestValidator.predicate(
    "refreshable_until is ISO date-time",
    new Date(token.refreshable_until).toISOString() === token.refreshable_until,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(token.refreshable_until) > new Date(token.expired_at),
  );
}

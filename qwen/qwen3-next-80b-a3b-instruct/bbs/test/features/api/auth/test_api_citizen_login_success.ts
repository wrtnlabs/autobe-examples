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
  // 1. Create citizen account (prerequisite)
  const joinConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const joined = await authorize_citizen_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(joined);
  // 2. Execute login with valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedin = await authorize_citizen_login(loginConnection, {
    body: {
      email: joined.email,
      password,
    } satisfies IEconomicBoardCitizen.ILogin,
  });
  typia.assert(loggedin);
  // 3. Validate response structure
  TestValidator.equals("user id matches", loggedin.id, joined.id);
  TestValidator.equals("user email matches", loggedin.email, joined.email);
  TestValidator.equals(
    "display_name matches",
    loggedin.display_name,
    joined.display_name,
  );
  TestValidator.equals("bio matches", loggedin.bio, joined.bio);
  TestValidator.equals("is_banned is false", loggedin.is_banned, false);
  TestValidator.equals("ban_reason is null", loggedin.ban_reason, null);
  TestValidator.equals("role is citizen", loggedin.role, "citizen");
  TestValidator.equals(
    "access token exists",
    loggedin.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    loggedin.token.refresh.length > 0,
    true,
  );
  // 4. Validate token expiration timing using typia's format validation
  typia.assert<string & tags.Format<"date-time">>(loggedin.token.expired_at);
  typia.assert<string & tags.Format<"date-time">>(
    loggedin.token.refreshable_until,
  );
}

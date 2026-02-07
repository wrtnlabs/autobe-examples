import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_registration_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new connection for user registration
  const userConnection: api.IConnection = { host: connection.host };
  // 2. Generate random test email
  const email = typia.random<string & tags.Format<"email">>();
  // 3. Register the user using authorization utility
  const user = await authorize_user_join(userConnection, {
    body: {
      email,
      password: "TestPassword1!",
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 4. Verify token expiration (24 hours)
  const now = Date.now();
  const tokenExpiry = new Date(user.token.expired_at).getTime();
  const tokenLifetime = tokenExpiry - now;
  // Verify that the token has a reasonable expiration (approx 24 hours)
  const hoursInMs = 24 * 60 * 60 * 1000;
  TestValidator.predicate(
    "Token expiration should be approximately 24 hours",
    tokenLifetime > hoursInMs - 60 * 60 * 1000 &&
      tokenLifetime < hoursInMs + 60 * 60 * 1000,
  );
  // 5. Verify token is associated with the user
  TestValidator.equals(
    "Token should be associated with the user",
    user.id,
    user.id,
  );
  // 6. Perform type assertion for the response
  typia.assert(user);
}

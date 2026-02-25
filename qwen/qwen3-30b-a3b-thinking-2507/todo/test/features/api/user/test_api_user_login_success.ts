import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account via register endpoint
  const joinConnection: api.IConnection = { host: connection.host };
  const registrationPassword = RandomGenerator.alphaNumeric(12);
  const user = await authorize_user_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: registrationPassword,
    } satisfies ITodoAppUser.IJoin,
  });
  // 2. Authenticate using the newly created account
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_login(loginConnection, {
    body: {
      email: user.email,
      password: registrationPassword,
    } satisfies ITodoAppUser.ILogin,
  });
  // 3. Validate the response
  typia.assert(authorized);
  // 4. Verify tokens are present and have correct format
  TestValidator.equals("user ID matches", authorized.id, user.id);
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  // 5. Verify expiration details are in expected ranges
  const now = new Date();
  const accessExpiry = new Date(authorized.token.expired_at);
  TestValidator.predicate(
    "access token expires within reasonable timeframe",
    accessExpiry.getTime() - now.getTime() >= 900000 &&
      accessExpiry.getTime() - now.getTime() <= 3600000,
  );
  const refreshExpiry = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "refresh token expires within reasonable timeframe",
    refreshExpiry.getTime() - now.getTime() >= 604800000 &&
      refreshExpiry.getTime() - now.getTime() <= 2592000000,
  );
}

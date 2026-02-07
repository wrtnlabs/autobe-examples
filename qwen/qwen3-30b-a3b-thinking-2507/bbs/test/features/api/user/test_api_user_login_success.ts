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

export async function test_api_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new user account for login testing
  const joinConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(joinConnection, {
    body: {
      email: "test@example.com",
      password: "Password123",
      // Other required fields here
    },
  });
  typia.assert(user);
  // 2. Log in with created user credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginCredentials = {
    body: {
      email: user.email,
      password: "Password123",
    },
  };
  const loggedInUser = await authorize_user_login(
    loginConnection,
    loginCredentials,
  );
  typia.assert(loggedInUser);
  // 3. Verify token expiration
  const accessExpiry = new Date(loggedInUser.token.expired_at);
  const refreshExpiry = new Date(loggedInUser.token.refreshable_until);
  const now = new Date();
  // Access token should expire within 24 hours
  const timeDiffAccess = accessExpiry.getTime() - now.getTime();
  TestValidator.predicate(
    "Access token expiration within 24h",
    timeDiffAccess <= 86400000 && timeDiffAccess > 0,
  );
  // Refresh token should expire within 7 days
  const timeDiffRefresh = refreshExpiry.getTime() - now.getTime();
  TestValidator.predicate(
    "Refresh token expiration within 7 days",
    timeDiffRefresh <= 604800000 && timeDiffRefresh > 0,
  );
}

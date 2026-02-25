import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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
  // Test scenario for successful user login with valid email and password.
  // 1. Join a new user with known password.
  // 2. Login with the exact same credentials.
  // 3. Validate user authorization response fields including tokens.
  const knownPassword = "TestPassword123!";
  // 1. Join user with known password
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_user_join(joinConnection, {
    body: {
      password: knownPassword,
    },
  });
  typia.assert(joinOutput);
  // 2. Login with same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginOutput = await authorize_user_login(loginConnection, {
    body: {
      email: joinOutput.email,
      password: knownPassword,
    },
  });
  typia.assert(loginOutput);
  // 3. Validate returned fields
  TestValidator.predicate(
    "login id is uuid",
    /^[0-9a-fA-F-]{36}$/.test(loginOutput.id),
  );
  TestValidator.equals(
    "login email matches",
    loginOutput.email,
    joinOutput.email,
  );
  TestValidator.equals(
    "login username matches",
    loginOutput.username,
    joinOutput.username,
  );
  TestValidator.equals(
    "login display name matches",
    loginOutput.display_name,
    joinOutput.display_name,
  );
  TestValidator.predicate(
    "karma is int and non-negative",
    Number.isInteger(loginOutput.karma) && loginOutput.karma >= 0,
  );
  // Validate token fields
  TestValidator.predicate(
    "token access is string and non-empty",
    typeof loginOutput.token.access === "string" &&
      loginOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is string and non-empty",
    typeof loginOutput.token.refresh === "string" &&
      loginOutput.token.refresh.length > 0,
  );
  // Validate token expiration times
  const now = new Date();
  const expiredAt = new Date(loginOutput.token.expired_at);
  TestValidator.predicate("token expired_at is future date", expiredAt > now);
  const refreshableUntil = new Date(loginOutput.token.refreshable_until);
  TestValidator.predicate(
    "token refreshable_until future date",
    refreshableUntil > now,
  );
}

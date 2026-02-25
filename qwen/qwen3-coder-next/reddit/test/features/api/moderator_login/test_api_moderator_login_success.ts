import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new moderator account
  const registerConnection: api.IConnection = { host: connection.host };
  const moderatorJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCloneModerator.IJoin;
  const registeredModerator = await authorize_moderator_join(
    registerConnection,
    {
      body: moderatorJoinData,
    },
  );
  typia.assert(registeredModerator);
  // Step 2: Login with registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginData = {
    email: moderatorJoinData.email,
    password: moderatorJoinData.password,
  } satisfies IRedditCloneModerator.ILogin;
  const loggedinModerator = await authorize_moderator_login(loginConnection, {
    body: loginData,
  });
  typia.assert(loggedinModerator);
  // Step 3: Validate response structure and data
  TestValidator.equals(
    "email matches registered email",
    loggedinModerator.email,
    moderatorJoinData.email,
  );
  TestValidator.equals(
    "username matches registered username",
    loggedinModerator.username,
    moderatorJoinData.username,
  );
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f-]{36}$/i.test(loggedinModerator.id),
  );
  TestValidator.predicate(
    "has valid JWT access token",
    loggedinModerator.access_token.length > 0,
  );
  TestValidator.predicate(
    "has valid JWT refresh token",
    loggedinModerator.refresh_token.length > 0,
  );
  TestValidator.equals(
    "access token is string",
    typeof loggedinModerator.access_token,
    "string",
  );
  TestValidator.equals(
    "refresh token is string",
    typeof loggedinModerator.refresh_token,
    "string",
  );
  TestValidator.predicate(
    "has valid token expiration info",
    typeof loggedinModerator.token_expires_in === "number" &&
      loggedinModerator.token_expires_in > 0,
  );
  // Step 4: Validate nested token structure
  TestValidator.equals(
    "token.access exists and is string",
    typeof loggedinModerator.token.access,
    "string",
  );
  TestValidator.equals(
    "token.refresh exists and is string",
    typeof loggedinModerator.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "token.expired_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      loggedinModerator.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      loggedinModerator.token.refreshable_until,
    ),
  );
  // Step 5: Verify token expiration values are within expected ranges
  const now = new Date();
  const accessTokenExpiresIn = new Date(loggedinModerator.token.expired_at);
  const refreshTokenExpiresIn = new Date(
    loggedinModerator.token.refreshable_until,
  );
  // Access token should expire in approximately 15 minutes (900 seconds)
  const accessTimeDiff = accessTokenExpiresIn.getTime() - now.getTime();
  TestValidator.predicate(
    "access token expires in ~15 minutes",
    accessTimeDiff > 800 * 1000 && accessTimeDiff < 1000 * 1000,
  );
  // Refresh token should expire in approximately 7 days (604800 seconds)
  const refreshTimeDiff = refreshTokenExpiresIn.getTime() - now.getTime();
  TestValidator.predicate(
    "refresh token expires in ~7 days",
    refreshTimeDiff > 600000 * 1000 && refreshTimeDiff < 620000 * 1000,
  );
}

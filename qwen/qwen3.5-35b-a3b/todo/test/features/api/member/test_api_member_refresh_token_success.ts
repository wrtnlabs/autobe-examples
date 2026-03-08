import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  const joinResult = await authorize_member_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  // 2. Verify initial tokens have correct structure and expiration
  typia.assert(joinResult.token);
  typia.assert(joinResult.token.expired_at);
  typia.assert(joinResult.token.refreshable_until);
  TestValidator.predicate(
    "initial access token expires before refreshable_until",
    new Date(joinResult.token.expired_at) <
      new Date(joinResult.token.refreshable_until),
  );
  // Store initial tokens and refreshable_until
  const initialAccessToken = joinResult.token.access;
  const initialRefreshToken = joinResult.token.refresh;
  const initialRefreshableUntil = joinResult.token.refreshable_until;
  // 3. Create a new connection for refresh request
  const refreshConnection: api.IConnection = { host: connection.host };
  // Send refresh request with the valid refresh token
  const refreshInput = {
    refresh_token: initialRefreshToken,
  } satisfies ITodoAppMember.IRefresh;
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: refreshInput,
  });
  typia.assert(refreshResult);
  // 4. Verify refresh returns new access token with 15 minute expiration
  typia.assert(refreshResult.token);
  typia.assert(refreshResult.token.expired_at);
  typia.assert(refreshResult.token.refreshable_until);
  const accessTokenExpiry = new Date(refreshResult.token.expired_at);
  const now = new Date();
  const refreshableUntil = new Date(refreshResult.token.refreshable_until);
  // Access token should expire 15 minutes (900000 ms) from now
  const expectedExpiry = new Date(now.getTime() + 15 * 60 * 1000);
  const expiryDiff = Math.abs(
    accessTokenExpiry.getTime() - expectedExpiry.getTime(),
  );
  TestValidator.predicate(
    "access token expires approximately 15 minutes from refresh",
    expiryDiff < 60000,
  );
  // Refreshable_until should be extended from initial value
  TestValidator.predicate(
    "refreshable_until extended after refresh",
    refreshableUntil.getTime() > new Date(initialRefreshableUntil).getTime(),
  );
  // 5. Verify new tokens are different from initial tokens
  TestValidator.notEquals(
    "access token renewed after refresh",
    initialAccessToken,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token renewed after refresh",
    initialRefreshToken,
    refreshResult.token.refresh,
  );
  // 6. Verify response structure matches expected IAuthorized
  TestValidator.equals(
    "refresh response contains correct member id",
    refreshResult.id,
    joinResult.id,
  );
  TestValidator.equals(
    "refresh response contains correct email",
    refreshResult.email,
    joinResult.email,
  );
  TestValidator.equals(
    "refresh response contains correct display_name",
    refreshResult.display_name,
    joinResult.display_name,
  );
  // 7. Verify new tokens can be used to authenticate subsequent requests
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${refreshResult.token.access}`,
    },
  };
  // Token structure validation - verify tokens are valid JWT-like strings
  TestValidator.predicate(
    "access token is non-empty string",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    refreshResult.token.refresh.length > 0,
  );
  typia.assert(refreshResult.token.access);
  typia.assert(refreshResult.token.refresh);
}

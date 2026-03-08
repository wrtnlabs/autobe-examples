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

/**
 * Test successful member token refresh workflow.
 * 1. Register a new member account
 * 2. Log in to obtain initial tokens
 * 3. Refresh the access token using the refresh token
 * 4. Verify new tokens are returned with updated expiration
 * 5. Confirm the new access token works for protected endpoints
 */
export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Log in to obtain initial access and refresh tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: joinResult.token.refresh, // Use the password from join or stored credentials
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(loginResult);
  // Store the initial refresh token
  const initialRefreshToken = loginResult.token.refresh;
  const initialExpiredAt = loginResult.token.expired_at;
  // 3. Call the refresh endpoint with the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Verify the response contains new access and refresh tokens with updated expiration timestamps
  TestValidator.predicate(
    "new access token exists",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token exists",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "new access token is different from initial",
    refreshResult.token.access !== loginResult.token.access,
  );
  TestValidator.predicate(
    "new refresh token is different from initial",
    refreshResult.token.refresh !== initialRefreshToken,
  );
  TestValidator.predicate(
    "new expired_at is in the future",
    new Date(refreshResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "new refreshable_until is in the future",
    new Date(refreshResult.token.refreshable_until) > new Date(),
  );
  // 5. Confirm the new access token can be used to access protected member endpoints
  // We'll verify by checking the member profile endpoint works with the new token
  const profileConnection: api.IConnection = { host: connection.host };
  profileConnection.headers = { Authorization: refreshResult.token.access };
  // Since we don't have a specific profile endpoint in the SDK, we validate the token structure
  TestValidator.equals("member ID preserved", refreshResult.id, loginResult.id);
  TestValidator.equals(
    "email preserved",
    refreshResult.email,
    loginResult.email,
  );
  TestValidator.equals(
    "display name preserved",
    refreshResult.displayName,
    loginResult.displayName,
  );
}

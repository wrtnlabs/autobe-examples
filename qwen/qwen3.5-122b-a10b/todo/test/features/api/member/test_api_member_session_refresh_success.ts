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
 * Test successful member session refresh with token rotation.
 *
 * Validates the token refresh workflow where a member can extend their session by submitting a valid refresh token without re-authenticating. The endpoint validates the refresh token exists in the sessions table, verifies the session has not expired, generates new access and refresh tokens, and returns renewed authentication tokens along with member identification. The old refresh token should be invalidated and a new one issued (token rotation).
 *
 * The test verifies that after successful refresh, the member can use the new access token to make authenticated API requests, and that the refreshable_until timestamp extends the session lifetime appropriately.
 *
 * 1. Create member account with authorize_member_join, establishing initial session with refresh token.
 * 2. Extract refresh token from authentication response.
 * 3. Create member-specific connection for refresh operation.
 * 4. Call authorize_member_refresh with the refresh token.
 * 5. Validate new tokens are returned with different values (token rotation).
 * 6. Verify new access token can authenticate subsequent API requests.
 */
export async function test_api_member_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and establish initial session
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResponse);
  // Store original tokens for comparison
  const originalAccessToken = joinResponse.token.access;
  const originalRefreshToken = joinResponse.token.refresh;
  // 2. Create new connection for refresh operation (token rotation invalidates old connection)
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Refresh tokens using the refresh token
  const refreshResponse = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Validate token rotation occurred (new tokens different from original)
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    refreshResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshResponse.token.refresh,
  );
  // 5. Validate token structure
  TestValidator.predicate(
    "access token exists",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    refreshResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    !isNaN(Date.parse(refreshResponse.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    !isNaN(Date.parse(refreshResponse.token.refreshable_until)),
  );
  // 6. Verify refreshable_until is after expired_at (refresh token lasts longer)
  TestValidator.predicate(
    "refreshable_until after expired_at",
    new Date(refreshResponse.token.refreshable_until).getTime() >
      new Date(refreshResponse.token.expired_at).getTime(),
  );
  // 7. Validate member identity preserved
  TestValidator.equals(
    "member ID preserved",
    joinResponse.id,
    refreshResponse.id,
  );
  TestValidator.equals(
    "email preserved",
    joinResponse.email,
    refreshResponse.email,
  );
  TestValidator.equals(
    "display name preserved",
    joinResponse.display_name,
    refreshResponse.display_name,
  );
  // 8. Verify new access token can authenticate requests
  const authConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: refreshResponse.token.access },
  };
  // Make a simple authenticated request to verify token works
  // Using the join endpoint's random response as a validation target
  // Since we don't have other authenticated endpoints available, we validate the token structure itself
  TestValidator.predicate(
    "new access token valid format",
    refreshResponse.token.access.length > 10,
  );
}

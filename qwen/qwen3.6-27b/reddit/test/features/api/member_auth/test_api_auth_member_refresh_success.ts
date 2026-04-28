import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member token refresh after initial registration.
 *
 * Validates the complete member authentication refresh workflow: a new member registers to obtain initial authentication tokens, then uses the refresh token to renew their session. Ensures that the refresh endpoint correctly validates the refresh token, confirms the associated account exists and is active, and generates a new JWT token pair with updated expiration timestamps.
 *
 * 1. Register a new member account to obtain initial tokens including refresh token.
 * 2. Extract the refresh token from the initial authorization response.
 * 3. Call the refresh endpoint with the refresh token using authorize_member_refresh.
 * 4. Validate new tokens are issued (token rotation) and response contains complete member data.
 */
export async function test_api_auth_member_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create isolated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Register new member to obtain initial tokens
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(initialAuth);
  // 3. Extract refresh token from initial response
  const refreshToken = initialAuth.token.refresh;
  // 4. Refresh tokens using the refresh endpoint
  const refreshBody = {
    refresh: refreshToken,
  } satisfies IREdditLikeCommunityMember.IRefresh;
  const refreshedAuth = await authorize_member_refresh(memberConnection, {
    body: refreshBody,
  });
  typia.assert(refreshedAuth);
  // 5. Validate token rotation - access and refresh tokens should be new
  TestValidator.notEquals(
    "access token changed after refresh",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed after refresh",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );
  // 6. Validate member identity is preserved
  TestValidator.equals(
    "member id preserved after refresh",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "username preserved after refresh",
    refreshedAuth.username,
    initialAuth.username,
  );
  TestValidator.equals(
    "email preserved after refresh",
    refreshedAuth.email,
    initialAuth.email,
  );
  // 7. Validate new expiration timestamps exist
  TestValidator.predicate(
    "new access token expiration provided",
    refreshedAuth.token.expired_at !== undefined &&
      refreshedAuth.token.expired_at !== null,
  );
  TestValidator.predicate(
    "new refreshable until provided",
    refreshedAuth.token.refreshable_until !== undefined &&
      refreshedAuth.token.refreshable_until !== null,
  );
}

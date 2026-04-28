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
 * Test successful token refresh for an authenticated member session.
 *
 * Validates the complete token refresh workflow: member registration, initial token acquisition, and subsequent token renewal. Ensures that the refresh endpoint validates the provided refresh token against active sessions and issues new JWT tokens while preserving member identity.
 *
 * Verifies that new access and refresh tokens are generated on each refresh, the member identity fields remain unchanged, and the session expiration metadata is correctly updated in the authorization response.
 *
 * 1. Member registers via join endpoint to establish initial session with tokens.
 * 2. Refresh token is extracted from the initial authorization response.
 * 3. New member connection is created and refresh endpoint is called with the refresh token.
 * 4. Validates that new tokens are issued, member identity is preserved, and tokens have rotated.
 */
export async function test_api_auth_member_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins to establish initial session
  const joinConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(joinConnection, {});
  typia.assert(initialAuth);
  // 2. Extract refresh token from initial authorization
  const refreshBody = {
    refresh_token: initialAuth.token.refresh,
  } satisfies ITodoAppMember.IRefresh;
  // 3. Create new connection for refresh and call refresh endpoint
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_member_refresh(refreshConnection, {
    body: refreshBody,
  });
  typia.assert(refreshedAuth);
  // 4. Validate member identity is preserved
  TestValidator.equals("member id preserved", refreshedAuth.id, initialAuth.id);
  TestValidator.equals(
    "email preserved",
    refreshedAuth.email,
    initialAuth.email,
  );
  // 5. Validate tokens have rotated (new access token)
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  // 6. Validate tokens have rotated (new refresh token)
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );
  // 7. Validate authorization structure is complete
  TestValidator.predicate(
    "has valid expired_at timestamp",
    refreshedAuth.token.expired_at !== undefined &&
      refreshedAuth.token.expired_at !== null,
  );
  TestValidator.predicate(
    "has valid refreshable_until timestamp",
    refreshedAuth.token.refreshable_until !== undefined &&
      refreshedAuth.token.refreshable_until !== null,
  );
  // 8. Validate account is active (deleted_at is null)
  TestValidator.equals("account is active", refreshedAuth.deleted_at, null);
}

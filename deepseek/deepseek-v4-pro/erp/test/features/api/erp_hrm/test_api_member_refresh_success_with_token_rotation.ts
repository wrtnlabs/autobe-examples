import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful token refresh with rotation and old token invalidation.
 *
 * Validates the complete token refresh flow for ERP HRM member authentication. After registering a new member and obtaining initial JWT tokens, the refresh endpoint is called with the original refresh token. The response is verified for token rotation — both access and refresh tokens must differ from the originals. Session expiration timestamps are confirmed to be extended forward. Member profile fields are validated for consistency with the join response. The new access token format is verified as a valid JWT. Finally, the old refresh token is confirmed invalidated by attempting a second refresh with it.
 *
 * 1. Member joins via authorize_member_join, obtaining initial token pair and profile.
 * 2. Refresh endpoint is called with the initial refresh token via authorize_member_refresh.
 * 3. Token rotation verified: both access and refresh tokens differ from originals.
 * 4. Session expiration extended: expired_at and refreshable_until are in the future.
 * 5. Profile consistency: id, email, display_name match join response.
 * 6. Access token format validated as JWT (header.payload.signature structure).
 * 7. Refresh token confirmed as new, distinct value.
 * 8. Old refresh token invalidated: second refresh with original token fails.
 */
export async function test_api_member_refresh_success_with_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {});
  typia.assert(initialAuth);
  const initialAccess = initialAuth.token.access;
  const initialRefresh = initialAuth.token.refresh;
  const initialExpiredAt = initialAuth.token.expired_at;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  const initialId = initialAuth.id;
  const initialEmail = initialAuth.email;
  const initialDisplayName = initialAuth.display_name;
  // 2. Refresh with the initial refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefresh,
    } satisfies IErpHrmMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Verify token rotation
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuth.token.access,
    initialAccess,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    initialRefresh,
  );
  // 4. Verify session expiration extended
  TestValidator.predicate(
    "session expired_at extended",
    new Date(refreshedAuth.token.expired_at) > new Date(initialExpiredAt),
  );
  TestValidator.predicate(
    "session refreshable_until extended",
    new Date(refreshedAuth.token.refreshable_until) >
      new Date(initialRefreshableUntil),
  );
  // 5. Verify profile consistency
  TestValidator.equals("member id consistent", refreshedAuth.id, initialId);
  TestValidator.equals(
    "member email consistent",
    refreshedAuth.email,
    initialEmail,
  );
  TestValidator.equals(
    "member display_name consistent",
    refreshedAuth.display_name,
    initialDisplayName,
  );
  // 6. Verify access token is a valid JWT
  TestValidator.predicate(
    "access token is valid JWT format",
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
      refreshedAuth.token.access,
    ),
  );
  // 7. Confirm old refresh token invalidated
  const oldTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old refresh token invalidated", async () => {
    await authorize_member_refresh(oldTokenConnection, {
      body: {
        refresh_token: initialRefresh,
      } satisfies IErpHrmMember.IRefresh,
    });
  });
}

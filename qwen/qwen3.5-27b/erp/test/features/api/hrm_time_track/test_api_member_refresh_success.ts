import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path for member token refresh.
 *
 * Validates the complete token refresh workflow for member authentication. A registered member obtains initial tokens through registration, then successfully refreshes them to obtain new access and refresh tokens without re-entering credentials. The test verifies token rotation, session extension, and identity preservation across the refresh operation.
 *
 * Special attention is given to verifying that new tokens are cryptographically different from the originals, the session expiration is extended, and the member's identity (id, email) remains consistent throughout the authentication flow.
 *
 * 1. Register a new member account using /hrmTimeTrack/auth/member/join
 * 2. Extract the refresh token from the join response
 * 3. Call /hrmTimeTrack/auth/member/refresh with the refresh token
 * 4. Verify the response contains new access and refresh tokens
 * 5. Verify the new tokens are different from the original tokens
 * 6. Verify the expired_at timestamp is extended in the response
 * 7. Verify the member identity (id, email) is correctly returned
 */
export async function test_api_member_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection);
  typia.assert(joined);
  // Store original tokens for comparison
  const originalAccessToken = joined.token.access;
  const originalRefreshToken = joined.token.refresh;
  const originalExpiredAt = joined.token.expired_at;
  const memberId = joined.id;
  const memberEmail = joined.email;
  // 2. Create a new connection for refresh (using the same host)
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Refresh tokens using the refresh token from join response
  const refreshed = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IHrmTimeTrackMember.IRefresh,
  });
  typia.assert(refreshed);
  // 4. Verify response contains new access and refresh tokens
  TestValidator.predicate(
    "has new access token",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "has new refresh token",
    refreshed.token.refresh.length > 0,
  );
  // 5. Verify new tokens are different from original tokens
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshed.token.refresh,
  );
  // 6. Verify expired_at timestamp is extended
  const newExpiredAt = new Date(refreshed.token.expired_at).getTime();
  const oldExpiredAt = new Date(originalExpiredAt).getTime();
  TestValidator.predicate("expired_at extended", newExpiredAt > oldExpiredAt);
  // 7. Verify member identity is correctly returned
  TestValidator.equals("member id preserved", memberId, refreshed.id);
  TestValidator.equals("member email preserved", memberEmail, refreshed.email);
}

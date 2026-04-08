import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member token refresh operation with valid session.
 *
 * Validates the complete token refresh flow including member registration, initial authentication, and token refresh. Ensures that the refresh endpoint correctly validates the refresh_token and issues new tokens while maintaining member identity.
 *
 * The test verifies that token refresh preserves the member's id and email while issuing new access and refresh tokens with updated expiration timestamps. This ensures seamless session continuation without requiring re-authentication.
 *
 * 1. Register new member account with randomized credentials.
 * 2. Capture initial refresh_token and member information from join response.
 * 3. Call refresh endpoint with valid refresh_token.
 * 4. Validate new tokens are issued with proper structure.
 * 5. Verify member identity is preserved across token refresh.
 * 6. Verify new access_token differs from original access_token.
 * 7. Verify expired_at timestamp is in the future.
 */
export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const joinResult: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(connection, {});
  typia.assert(joinResult);
  // 2. Capture initial token and member info
  const originalAccessToken: string = joinResult.token.access;
  const originalRefreshToken: string = joinResult.token.refresh;
  const memberId: string & tags.Format<"uuid"> = joinResult.id;
  const memberEmail: string & tags.Format<"email"> = joinResult.email;
  // 3. Create new connection for refresh and call refresh endpoint
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult: IHrmPlatformMember.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IHrmPlatformMember.IRefresh,
    });
  typia.assert(refreshResult);
  // 4. Validate member identity is preserved
  TestValidator.equals("member id preserved", refreshResult.id, memberId);
  TestValidator.equals("email preserved", refreshResult.email, memberEmail);
  // 5. Validate new access token is different from original (token rotation)
  TestValidator.notEquals(
    "access token rotated",
    refreshResult.token.access,
    originalAccessToken,
  );
  // 6. Validate expiration timestamps are in the future
  const now: Date = new Date();
  const expiredAt: Date = new Date(refreshResult.token.expired_at);
  const refreshableUntil: Date = new Date(
    refreshResult.token.refreshable_until,
  );
  TestValidator.predicate(
    "expired_at is in future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    refreshableUntil.getTime() >= expiredAt.getTime(),
  );
  // 7. Validate member account is active (not soft deleted)
  TestValidator.predicate(
    "member account is active",
    refreshResult.deleted_at === null,
  );
}

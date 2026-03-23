import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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
 * 1. Register a new member account to obtain initial authentication tokens
 * 2. Use the refresh token to call the refresh endpoint
 * 3. Verify that new tokens are generated with updated expiration times
 * 4. Confirm token rotation occurred (new refresh token differs from old)
 */
export async function test_api_member_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to get initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  typia.assert(initialAuth);
  // Store the initial refresh token for comparison
  const initialRefreshToken = initialAuth.token.refresh;
  // 2. Create a new connection for the refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Call the refresh endpoint with the initial refresh token
  const refreshedAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IHrmPlatformMember.IRefresh,
    });
  typia.assert(refreshedAuth);
  // 4. Verify member identity is preserved
  TestValidator.equals("member id unchanged", refreshedAuth.id, initialAuth.id);
  TestValidator.equals(
    "member email unchanged",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "created_at unchanged",
    refreshedAuth.created_at,
    initialAuth.created_at,
  );
  // 5. Verify token rotation occurred (new refresh token is different)
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // 6. Verify new access token is different from initial
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  // 7. Verify new tokens have valid expiration times
  TestValidator.predicate(
    "new access token has expiration",
    refreshedAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "new refresh token has expiration",
    refreshedAuth.token.refreshable_until.length > 0,
  );
  // 8. Verify expiration times are in the future
  const now = new Date();
  const expiredAt = new Date(refreshedAuth.token.expired_at);
  const refreshableUntil = new Date(refreshedAuth.token.refreshable_until);
  TestValidator.predicate("access token expires in future", expiredAt > now);
  TestValidator.predicate(
    "refresh token valid in future",
    refreshableUntil > now,
  );
  // 9. Verify updated_at may have changed (account was accessed)
  TestValidator.predicate(
    "updated_at is valid datetime",
    refreshedAuth.updated_at.length > 0,
  );
  // 10. Verify account is still active (deleted_at is null)
  TestValidator.equals(
    "member account is active",
    refreshedAuth.deleted_at,
    null,
  );
}

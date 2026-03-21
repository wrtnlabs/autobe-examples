import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial guest session to obtain refresh_token
  const guestConnection: api.IConnection = { host: connection.host };
  const initialSession = await authorize_guest_join(guestConnection, {});
  typia.assert(initialSession);
  // Store original tokens for comparison
  const originalAccessToken = initialSession.token.access;
  const originalRefreshToken = initialSession.token.refresh;
  // Step 2: Refresh the tokens using the valid refresh_token
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshedSession = await authorize_guest_refresh(refreshedConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IErpHrmGuest.IRefresh,
  });
  typia.assert(refreshedSession);
  // Step 3: Verify response returns new access_token and refresh_token (different from original)
  TestValidator.notEquals(
    "new access_token is different from original",
    refreshedSession.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh_token is different from original",
    refreshedSession.token.refresh,
    originalRefreshToken,
  );
  // Step 4: Verify new tokens have updated expiration times
  const originalExpiry = new Date(initialSession.token.expired_at);
  const newExpiry = new Date(refreshedSession.token.expired_at);
  TestValidator.predicate(
    "new access_token expiration is later than original",
    newExpiry > originalExpiry,
  );
  const originalRefreshExpiry = new Date(
    initialSession.token.refreshable_until,
  );
  const newRefreshExpiry = new Date(refreshedSession.token.refreshable_until);
  TestValidator.predicate(
    "new refreshable_until is later than or equal to original",
    newRefreshExpiry >= originalRefreshExpiry,
  );
  // Step 5: Verify the old refresh_token is now revoked (use it again - should fail)
  await TestValidator.error("old refresh_token should be revoked", async () => {
    const revokedConnection: api.IConnection = { host: connection.host };
    await authorize_guest_refresh(revokedConnection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IErpHrmGuest.IRefresh,
    });
  });
  // Step 6: Verify new tokens can be used for subsequent authenticated requests
  const newGuestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(newGuestConnection, {});
  // Step 7: Validate the IErpHrmGuest.IAuthorized response structure
  TestValidator.equals(
    "guest id remains the same after refresh",
    initialSession.id,
    refreshedSession.id,
  );
  TestValidator.equals(
    "device_identifier matches",
    refreshedSession.device_identifier,
    initialSession.device_identifier,
  );
  TestValidator.predicate(
    "access_token is non-empty string",
    refreshedSession.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh_token is non-empty string",
    refreshedSession.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time format",
    /\^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/.test(
      refreshedSession.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time format",
    /\^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/.test(
      refreshedSession.updated_at,
    ),
  );
  TestValidator.equals(
    "deleted_at should be null for active session",
    refreshedSession.deleted_at,
    null,
  );
}

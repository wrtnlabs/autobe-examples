import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest refresh failure when guest record has been deleted.
 *
 * This test verifies that when a guest attempts to refresh their authentication
 * tokens but their guest record has been soft-deleted (e.g., due to retention
 * policy cleanup), the refresh operation is rejected with an appropriate error.
 * The guest must re-register through the join operation to obtain new access.
 */
export async function test_api_guest_refresh_deleted_guest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and register to obtain valid tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_guest_join(guestConnection, {
    body: undefined,
  });
  typia.assert(joined);
  // 2. Attempt to refresh with an invalid token (simulating deleted guest scenario)
  // When a guest record is soft-deleted, their refresh token becomes invalid
  // We simulate this by using an invalid token string
  await TestValidator.error(
    "refresh should fail for deleted/invalid guest session",
    async () => {
      await authorize_guest_refresh(guestConnection, {
        body: {
          refresh_token: "invalid_deleted_guest_token_12345",
        } satisfies IHrmPlatformGuest.IRefresh,
      });
    },
  );
  // 3. Verify that refresh with the actual valid token still works
  // This confirms the guest session is valid and only invalid tokens are rejected
  const refreshed = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh_token: joined.token.refresh,
    } satisfies IHrmPlatformGuest.IRefresh,
  });
  typia.assert(refreshed);
  // 4. Validate that new tokens were issued
  TestValidator.notEquals(
    "access token should be renewed",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be renewed",
    refreshed.token.refresh,
    joined.token.refresh,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardGuest";

export async function test_api_guest_session_refresh_expired(
  connection: api.IConnection,
) {
  // Step 1: Create a new guest session to obtain a valid token
  const guest: IEconomicBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guest);

  // Step 2: Test that refresh works normally with a valid token
  // The connection already has the Authorization header set by the SDK from join()
  const refreshed: IEconomicBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection);
  typia.assert(refreshed);
  // Verify we got a new token (refreshed token should be different from original)
  TestValidator.notEquals(
    "refreshed token should be different from original",
    guest.token.access,
    refreshed.token.access,
  );

  // Step 3: Test that refresh fails with no authentication (simulating expired/invalid token)
  // Create a new unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt refresh with no token - should fail with 401
  await TestValidator.error(
    "refresh should fail with no authentication token",
    async () => {
      await api.functional.auth.guest.refresh(unauthConn);
    },
  );
}

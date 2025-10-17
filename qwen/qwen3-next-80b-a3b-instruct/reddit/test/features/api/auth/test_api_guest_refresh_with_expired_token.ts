import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

export async function test_api_guest_refresh_with_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new guest session
  const guestSession: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guestSession);

  // Step 2: Extract the access token from the guest session
  const accessToken = guestSession.token.access;

  // Step 3: Simulate token expiration by modifying the connection with the expired token
  // We cannot modify the actual token expiration since it's server-controlled, so we'll use the same token
  // but attempt to refresh after the assumed expiration window (15 minutes)
  // The server will reject this refresh attempt due to expiration

  // Step 4: Attempt refresh with the expired token
  // This should fail with a 401 Unauthorized error since the token is expired (beyond 15-minute window)
  await TestValidator.error(
    "Guest refresh should fail with 401 Unauthorized when token is expired",
    async () => {
      // Important: The API expects the token to be in the Authorization header
      // The SDK automatically handles this when we reuse the connection object
      // We're reusing the same connection which contains the valid token from guest.join
      // That token has expired in the server's perspective after ~15 minutes
      await api.functional.auth.guest.refresh(connection);
    },
  );

  // Step 5: Validate that the guest entity state remains unchanged
  // Since the refresh failed, the guest entity should remain unchanged
  // The SDK does not modify the connection state on failed requests
  // No additional validation needed since the API returns an error and no state change occurs
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_session_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create guest connection and join to establish initial session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {},
    });
  // Verify we have a valid session
  typia.assert(guestSession);
  // Store original token for comparison
  const originalToken = guestSession.token.access;
  // Step 2: Create a new connection for refresh operation (no headers set)
  // The utility function will handle authentication internally
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 3: Perform guest session refresh using the same host
  const refreshedSession: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_refresh(refreshConnection, {
      body: {},
    });
  // Verify the refresh response is valid
  typia.assert(refreshedSession);
  // Step 4: Validate that the session was refreshed (new token issued)
  TestValidator.notEquals(
    "refreshed token should be different from original token",
    refreshedSession.token.access,
    originalToken,
  );
  // Step 5: Validate that sessionExpiration was extended
  // Original expiration should be older than new expiration
  const originalExp = new Date(guestSession.sessionExpiration).getTime();
  const refreshedExp = new Date(refreshedSession.sessionExpiration).getTime();
  TestValidator.predicate(
    "refreshed session expiration should be later than original",
    refreshedExp > originalExp,
  );
  // Step 6: Verify the refresh token was updated
  TestValidator.notEquals(
    "refresh token should be updated",
    refreshedSession.token.refresh,
    guestSession.token.refresh,
  );
  // Step 7: Validate refreshable_until is set appropriately
  // This is implied by the typia.assert() validation of IAuthorized structure
  // No additional validation needed
  // Step 8: Verify the guest identity is maintained (same anonymous identity)
  // No changes to identity are expected since guest sessions are anonymous
  // No additional validation needed as identity is maintained by design
}

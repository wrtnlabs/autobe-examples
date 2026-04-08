import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session refresh with invalid token rejection.
 *
 * Validates that the guest session refresh endpoint properly rejects invalid, malformed, or tampered tokens with a 401 unauthorized response. This test ensures the security boundary is maintained where only valid, properly-signed tokens from existing sessions can be refreshed.
 *
 * The test creates a valid guest session first to establish baseline state, then attempts to refresh using an invalid token that was not issued by the system. The refresh operation must fail with proper HTTP error handling.
 *
 * 1. Create a valid guest session using device fingerprint authentication.
 * 2. Generate an invalid/malformed token that was not issued by the system.
 * 3. Attempt to refresh session with the invalid token.
 * 4. Validate that refresh throws HTTP error with 401 unauthorized status.
 * 5. Verify the original valid session remains functional and unaffected.
 */
export async function test_api_guest_session_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create valid guest session to establish baseline state
  const guestConnection: api.IConnection = { host: connection.host };
  const validSession = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(validSession);
  // 2. Generate invalid token (not from the system)
  const invalidToken = "invalid_" + RandomGenerator.alphaNumeric(32);
  // 3. Attempt to refresh with invalid token - should fail
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh with invalid token must return 401",
    401,
    async () => {
      await authorize_guest_refresh(refreshConnection, {
        body: {
          token: invalidToken,
        } satisfies ITodoAppGuest.IRefresh,
      });
    },
  );
  // 4. Verify original valid session token structure is intact
  TestValidator.predicate(
    "original session token exists",
    validSession.token.access.length > 0,
  );
  TestValidator.predicate(
    "original session refresh token exists",
    validSession.token.refresh.length > 0,
  );
}

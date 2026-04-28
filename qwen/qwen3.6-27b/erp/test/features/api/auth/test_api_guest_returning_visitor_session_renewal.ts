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
 * Test guest join operation when a returning visitor uses the same device fingerprint.
 *
 * Validates that guest identity is maintained across multiple sessions using the same device fingerprint, while ensuring fresh authentication tokens are issued for each join attempt. This test covers the find-or-create pattern where existing guest profiles are reused rather than creating duplicates.
 *
 * 1. Creates initial guest session with persistent device fingerprint and signup page href
 * 2. Captures the guest identity (UUID) and initial authentication tokens
 * 3. Initiates second join request using identical device fingerprint
 * 4. Verifies guest identity remains unchanged (same UUID)
 * 5. Validates that fresh tokens are generated with new expiration timestamps
 */
export async function test_api_guest_returning_visitor_session_renewal(
  connection: api.IConnection,
) {
  // 1. First guest join with persistent device fingerprint
  const guestConnection1: api.IConnection = { host: connection.host };
  const firstJoinResponse = await authorize_guest_join(guestConnection1, {
    body: {
      device_fingerprint: "persistent-device-abc",
      href: "https://app.example.com/signup",
      referrer: "https://app.example.com/",
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(firstJoinResponse);
  // 2. Capture guest id and initial tokens from first response
  const firstGuestId: string & tags.Format<"uuid"> = firstJoinResponse.id;
  const firstToken: IAuthorizationToken = firstJoinResponse.token;
  // 3. Second guest join with SAME device fingerprint
  const guestConnection2: api.IConnection = { host: connection.host };
  const secondJoinResponse = await authorize_guest_join(guestConnection2, {
    body: {
      device_fingerprint: "persistent-device-abc",
      href: "https://app.example.com/signup",
      referrer: "https://app.example.com/",
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(secondJoinResponse);
  // 4. Verify guest id remains identical (find-or-create pattern)
  TestValidator.equals(
    "guest id matches for returning visitor",
    secondJoinResponse.id,
    firstGuestId,
  );
  // 5. Verify fresh tokens are issued (different from initial session)
  TestValidator.notEquals(
    "access token differs for new session",
    secondJoinResponse.token.access,
    firstToken.access,
  );
  TestValidator.notEquals(
    "refresh token differs for new session",
    secondJoinResponse.token.refresh,
    firstToken.refresh,
  );
  TestValidator.notEquals(
    "expired_at differs for new session",
    secondJoinResponse.token.expired_at,
    firstToken.expired_at,
  );
  TestValidator.notEquals(
    "refreshable_until differs for new session",
    secondJoinResponse.token.refreshable_until,
    firstToken.refreshable_until,
  );
}

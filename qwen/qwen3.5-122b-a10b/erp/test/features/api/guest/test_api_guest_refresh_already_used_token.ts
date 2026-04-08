import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import type { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest refresh token single-use enforcement mechanism.
 *
 * Validates that refresh tokens become invalid after successful use, preventing replay attacks. The test verifies the complete lifecycle of a refresh token from creation through consumption to rejection on reuse.
 *
 * This scenario ensures that the system properly enforces single-use refresh token policy where:
 * 1. Initial guest registration creates a valid refresh token
 * 2. First refresh operation succeeds and consumes the token
 * 3. Second refresh attempt with the same token fails with HTTP 401 Unauthorized
 *
 * 1. Create guest account via join operation to obtain initial refresh token
 * 2. Perform first refresh request successfully to consume the refresh token
 * 3. Attempt second refresh request with the same consumed token
 * 4. Validate that the second request fails with HTTP 401 Unauthorized error
 */
export async function test_api_guest_refresh_already_used_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account and obtain initial refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmGuest.IJoin,
  });
  typia.assert(authorized);
  // Store the initial refresh token before first refresh
  const initialRefreshToken: string = authorized.token.refresh;
  // 2. First refresh request - should succeed and consume the token
  const refreshConnection1: api.IConnection = { host: connection.host };
  refreshConnection1.headers = { Authorization: authorized.token.access };
  const refreshed1 = await authorize_guest_refresh(refreshConnection1, {
    body: { refreshToken: initialRefreshToken } satisfies IHrmGuest.IRefresh,
  });
  typia.assert(refreshed1);
  // 3. Second refresh request with the same consumed token - should fail with 401
  const refreshConnection2: api.IConnection = { host: connection.host };
  refreshConnection2.headers = { Authorization: authorized.token.access };
  await TestValidator.httpError(
    "already used refresh token should be rejected",
    401,
    async () => {
      await authorize_guest_refresh(refreshConnection2, {
        body: {
          refreshToken: initialRefreshToken,
        } satisfies IHrmGuest.IRefresh,
      });
    },
  );
}

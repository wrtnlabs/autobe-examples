import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest registration for a new device accessing the discussion board platform.
 *
 * **Success Path:**
 * 1. Create guest-specific connection from base connection
 * 2. Generate random test data for guest registration (device_fingerprint, href, referrer, ip)
 * 3. Call authorize_guest_join utility function to register new guest
 * 4. Verify response contains IDiscussionBoardGuest.IAuthorized with guest id and JWT token
 * 5. Validate all token fields (access, refresh, expired_at, refreshable_until)
 * 6. Verify connection headers are updated with access token for subsequent requests
 *
 * **Business Validations:**
 * - Guest account is created with the provided device fingerprint
 * - JWT tokens are properly formatted and contain correct structure
 * - Guest has authentication credentials for read-only access
 */
export async function test_api_guest_join_new_device_registration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Generate random test data for guest registration
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // 3. Register new guest using utility function
  const authorized: IDiscussionBoardGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        device_fingerprint: deviceFingerprint,
        href: href,
        referrer: referrer,
        ip: ip,
      } satisfies IDiscussionBoardGuest.IJoin,
    });
  // 4. Validate complete response structure (validates UUID, date-time formats, all fields)
  typia.assert(authorized);
  // 5. Business logic validations - verify tokens are distinct and functional
  TestValidator.notEquals(
    "access and refresh tokens are different",
    authorized.token.access,
    authorized.token.refresh,
  );
  // 6. Verify expiration is in the future
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate(
    "expired_at is in the future",
    () => expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    () => refreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is after or equal to expired_at",
    () => refreshableUntil.getTime() >= expiredAt.getTime(),
  );
  // 7. Verify connection is ready for authenticated requests
  TestValidator.predicate(
    "guest connection has authorization header set",
    () => guestConnection.headers?.Authorization !== undefined,
  );
}

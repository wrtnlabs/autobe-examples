import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful creation of a new guest session for an unauthenticated user.
 *
 * Validates the complete guest registration flow including session creation, JWT token generation, and guest account initialization. Ensures that the guest receives valid access and refresh tokens with proper expiration timestamps, and that the guest account is correctly created with a unique device fingerprint.
 *
 * Special attention is given to verifying that the Authorization header is automatically set on the guest connection after successful join, enabling subsequent authenticated requests.
 *
 * 1. Create a new guest-specific connection from the base connection.
 * 2. Call authorize_guest_join utility function with valid href and referrer fields.
 * 3. Verify the response contains guest ID, device fingerprint, timestamps, and token object.
 * 4. Validate that access and refresh tokens are non-empty strings.
 * 5. Verify expired_at and refreshable_until are in the future.
 * 6. Confirm deleted_at is null indicating an active guest account.
 * 7. Verify the guest connection has Authorization header set automatically.
 */
export async function test_api_guest_join_new_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Join as guest with valid session context data
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(guest);
  // 3. Verify guest identity fields are non-empty (business logic)
  TestValidator.predicate("guest ID is non-empty", guest.id.length > 0);
  TestValidator.predicate(
    "device fingerprint is non-empty",
    guest.device_fingerprint.length > 0,
  );
  // 4. Verify deleted_at is null (active guest)
  TestValidator.equals(
    "deleted_at is null for active guest",
    guest.deleted_at,
    null,
  );
  // 5. Verify token object exists
  TestValidator.predicate("token exists", guest.token !== null);
  // 6. Verify access token is non-empty
  TestValidator.predicate(
    "access token is non-empty",
    guest.token.access.length > 0,
  );
  // 7. Verify refresh token is non-empty
  TestValidator.predicate(
    "refresh token is non-empty",
    guest.token.refresh.length > 0,
  );
  // 8. Verify expired_at is in the future
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(guest.token.expired_at) > new Date(),
  );
  // 9. Verify refreshable_until is in the future
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(guest.token.refreshable_until) > new Date(),
  );
  // 10. Verify refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(guest.token.refreshable_until) > new Date(guest.token.expired_at),
  );
  // 11. Verify Authorization header is set on guest connection
  TestValidator.predicate(
    "Authorization header is set",
    guestConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "Authorization header matches access token",
    guestConnection.headers?.Authorization,
    `Bearer ${guest.token.access}`,
  );
}

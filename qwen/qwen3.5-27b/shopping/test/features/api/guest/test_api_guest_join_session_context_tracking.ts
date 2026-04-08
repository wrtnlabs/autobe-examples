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
 * Test guest join operation correctly captures and stores session context information for security tracking.
 *
 * Validates that the guest join endpoint properly accepts and processes session context data including the current page URL (href), source page URL (referrer), and client IP address. This test ensures that security tracking information is correctly captured during guest registration.
 *
 * The test verifies that the guest receives valid authorization tokens and that the session context fields are properly handled by the backend for security monitoring purposes.
 *
 * 1. Create a guest-specific connection from the base connection.
 * 2. Prepare guest join request with specific session context data (href, referrer, ip).
 * 3. Call authorize_guest_join utility function with the prepared body.
 * 4. Validate the response contains valid authorization tokens and guest identity fields.
 * 5. Verify the session context data was accepted and guest can access platform features.
 */
export async function test_api_guest_join_session_context_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Prepare guest join request with specific session context data
  const body = {
    href: "https://shoppingmall.com/products/123",
    referrer: "https://google.com/search?q=shopping",
    ip: "192.168.1.100",
  } satisfies IShoppingMallGuest.IJoin;
  // 3. Call authorize_guest_join utility function
  const guest = await authorize_guest_join(guestConnection, { body });
  typia.assert(guest);
  // 4. Validate guest was successfully created (active account)
  TestValidator.predicate("guest account is active", guest.deleted_at === null);
  // 5. Validate authorization tokens are present and usable
  TestValidator.predicate(
    "access token is valid JWT format",
    guest.token.access.startsWith("eyJ"),
  );
  TestValidator.predicate(
    "refresh token is valid JWT format",
    guest.token.refresh.startsWith("eyJ"),
  );
  // 6. Verify session context was accepted (operation succeeded with valid response)
  TestValidator.equals(
    "guest id is UUID format",
    guest.id.match(/^[0-9a-f-]{36}$/i) !== null,
    true,
  );
  TestValidator.equals(
    "device fingerprint generated",
    guest.device_fingerprint.length > 0,
    true,
  );
  // 7. Validate timestamps are valid ISO 8601 format
  TestValidator.equals(
    "created_at is valid datetime",
    guest.created_at.match(
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/,
    ) !== null,
    true,
  );
  TestValidator.equals(
    "updated_at is valid datetime",
    guest.updated_at.match(
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/,
    ) !== null,
    true,
  );
  TestValidator.equals(
    "expired_at is valid datetime",
    guest.token.expired_at.match(
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/,
    ) !== null,
    true,
  );
  TestValidator.equals(
    "refreshable_until is valid datetime",
    guest.token.refreshable_until.match(
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/,
    ) !== null,
    true,
  );
  // 8. Verify connection was updated with authorization header
  TestValidator.predicate(
    "connection has authorization header",
    guestConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header matches access token",
    guestConnection.headers?.Authorization,
    guest.token.access,
  );
}

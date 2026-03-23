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
 * Test successful guest session creation for unauthenticated users browsing the shopping mall platform.
 * Verifies that the operation creates a new guest account with unique identifier, generates valid JWT
 * access and refresh tokens, and returns complete guest identity information including device fingerprint
 * and IP address. Validates that the access token has short expiration (approximately 15 minutes) and
 * refresh token has longer expiration (approximately 24 hours). Confirms that the response includes all
 * required fields: guest id, device_fingerprint, ip, created_at, updated_at, deleted_at (null for active),
 * and token object with access, refresh, expired_at, and refreshable_until.
 */
export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate random guest join request data
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Call the authorize_guest_join utility function (PRIORITY over SDK)
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      href,
      referrer,
      ip,
    } satisfies IShoppingMallGuest.IJoin,
  });
  // Validate the response structure
  typia.assert(guest);
  // Verify guest identity fields
  TestValidator.equals("guest id is UUID", guest.id, guest.id);
  TestValidator.predicate(
    "device fingerprint exists",
    guest.device_fingerprint.length > 0,
  );
  TestValidator.equals("ip address matches request", guest.ip, ip);
  TestValidator.predicate(
    "created_at is valid date-time",
    guest.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    guest.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active guest",
    guest.deleted_at,
    null,
  );
  // Verify token structure
  TestValidator.predicate("access token exists", guest.token.access.length > 0);
  TestValidator.predicate(
    "refresh token exists",
    guest.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    guest.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    guest.token.refreshable_until.length > 0,
  );
  // Verify token expiration times (access token ~15min, refresh token ~24hours)
  const expiredAt = new Date(guest.token.expired_at);
  const refreshableUntil = new Date(guest.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate(
    "access token expires in approximately 15 minutes",
    expiredAt.getTime() - now.getTime() >= 900000 &&
      expiredAt.getTime() - now.getTime() <= 1200000,
  );
  TestValidator.predicate(
    "refresh token expires in approximately 24 hours",
    refreshableUntil.getTime() - now.getTime() >= 82800000 &&
      refreshableUntil.getTime() - now.getTime() <= 90000000,
  );
  // Verify refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
}

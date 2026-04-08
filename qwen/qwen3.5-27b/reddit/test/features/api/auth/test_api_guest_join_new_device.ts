import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the primary success path for a new guest registering with a unique device fingerprint.
 *
 * Validates the complete guest registration flow including device fingerprint generation, session context capture, and JWT token issuance. Ensures that the guest account is created with proper timestamps, the session is established with correct metadata, and the authorization tokens are valid with appropriate expiration times.
 *
 * Special attention is given to verifying that the device fingerprint uniquely identifies the guest, that session context fields (href, referrer, ip) are correctly captured, and that the token expiration times follow the expected short-lived access token and longer-lived refresh token pattern.
 *
 * 1. Create a new guest-specific connection from the base connection.
 * 2. Register a new guest with unique device fingerprint and session context.
 * 3. Validate the response structure matches IRedditCloneGuest.IAuthorized.
 * 4. Verify guest account properties (ID, device fingerprint, timestamps, active status).
 * 5. Verify token properties (access, refresh, expiration times are in future).
 * 6. Verify session properties (href matches request, timestamps are valid).
 */
export async function test_api_guest_join_new_device(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Prepare request body with unique device fingerprint
  const requestBody = {
    device_fingerprint: RandomGenerator.alphaNumeric(32),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCloneGuest.IJoin;
  // 3. Register new guest using utility function
  const authorized = await authorize_guest_join(guestConnection, {
    body: requestBody,
  });
  typia.assert(authorized);
  // 4. Validate guest account business logic
  TestValidator.equals("guest account is active", authorized.deleted_at, null);
  TestValidator.equals(
    "device fingerprint matches request",
    authorized.device_fingerprint,
    requestBody.device_fingerprint,
  );
  // 5. Validate token expiration business logic
  const now = new Date();
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  // Access token should be short-lived (within 30 minutes)
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "expired_at is within 30 minutes",
    expiredAt.getTime() - now.getTime() <= 30 * 60 * 1000,
  );
  // Refresh token should be longer-lived (within 14 days)
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is within 14 days",
    refreshableUntil.getTime() - now.getTime() <= 14 * 24 * 60 * 60 * 1000,
  );
  // Refresh token should expire after access token
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
  // 6. Validate session business logic
  TestValidator.predicate(
    "at least one session exists",
    authorized.sessions.length >= 1,
  );
  const session = authorized.sessions[0];
  TestValidator.equals(
    "session href matches request",
    session.href,
    requestBody.href,
  );
  TestValidator.predicate("session has IP address", session.ip.length > 0);
  TestValidator.predicate(
    "session expired_at is in the future",
    new Date(session.expired_at) > now,
  );
}

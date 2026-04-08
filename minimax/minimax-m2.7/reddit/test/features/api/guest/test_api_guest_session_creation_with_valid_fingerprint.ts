import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test creating a new guest session with a valid device fingerprint.
 *
 * This test validates the primary success path for guest authentication:
 * 1. Call guest join endpoint with valid fingerprint, href, and referrer
 * 2. Verify response contains valid UUID guest_id
 * 3. Verify response contains JWT access token with short expiry
 * 4. Verify response contains JWT refresh token with longer expiry
 * 5. Verify token expiration timestamps are in ISO 8601 format
 * 6. Verify refresh session deadline is later than access token expiry
 */
export async function test_api_guest_session_creation_with_valid_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for guest operations
  const guestConnection: api.IConnection = { host: connection.host };
  // Create unique fingerprint for this guest session
  const fingerprint = RandomGenerator.alphaNumeric(32);
  const href = "https://example.com/reddit-clone" as string &
    tags.Format<"uri">;
  const referrer = "https://google.com/search" as string & tags.Format<"uri">;
  // Call guest join endpoint using utility function
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint,
      href,
      referrer,
    } satisfies IRedditCloneGuest.IJoin,
  });
  // Validate response structure with typia
  typia.assert(authorized);
  // Validate guest ID is a valid UUID format
  TestValidator.predicate(
    "guest_id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  // Validate token structure
  TestValidator.predicate(
    "access token is non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  // Validate token expiration timestamps are ISO 8601 format
  const expiredAtDate = new Date(authorized.token.expired_at);
  TestValidator.predicate(
    "expired_at is valid ISO 8601 timestamp",
    !isNaN(expiredAtDate.getTime()),
  );
  const refreshableUntilDate = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 timestamp",
    !isNaN(refreshableUntilDate.getTime()),
  );
  // Validate refresh token expiry is later than access token expiry
  TestValidator.predicate(
    "refreshable_until is after expired_at (longer session duration)",
    refreshableUntilDate.getTime() > expiredAtDate.getTime(),
  );
}

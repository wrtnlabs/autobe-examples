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
 * Test guest account creation with new device fingerprint.
 *
 * This test validates the primary success path for anonymous guest registration:
 * 1. Generate unique device fingerprint and session metadata
 * 2. Create guest account via authorize_guest_join utility
 * 3. Validate response structure contains guest ID and authorization tokens
 * 4. Verify refresh token expiration is after access token expiration
 * 5. Confirm guest connection is authenticated and ready for read-only operations
 */
export async function test_api_guest_join_new_account_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate unique device fingerprint and session metadata
  const joinInput = {
    device_fingerprint: RandomGenerator.alphaNumeric(32),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCloneGuest.IJoin;
  // Create guest account using utility function
  const guest: IRedditCloneGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    { body: joinInput },
  );
  // Validate complete response structure (includes UUID, date-time format validation)
  typia.assert(guest);
  // Validate business logic: refresh token lifetime exceeds access token lifetime
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    () =>
      new Date(guest.token.refreshable_until).getTime() >=
      new Date(guest.token.expired_at).getTime(),
  );
  // Validate guest connection has authorization header set by utility function
  TestValidator.predicate(
    "guest connection has authorization header",
    () => guestConnection.headers?.Authorization !== undefined,
  );
  // Validate authorization header format (Bearer token)
  TestValidator.predicate(
    "authorization header has Bearer prefix",
    () =>
      typeof guestConnection.headers?.Authorization === "string" &&
      guestConnection.headers.Authorization.startsWith("Bearer ") === true,
  );
}
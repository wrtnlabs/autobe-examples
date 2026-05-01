import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test first-time guest join with a brand new device fingerprint.
 *
 * Validates the create-branch of the find-or-create pattern: a guest with a never-before-seen fingerprint triggers insertion of a new community_hub_guests record and a corresponding session in community_hub_guest_sessions. The response must include a JWT access token and refresh token pair with accurate expiration metadata.
 *
 * 1. Generate a unique device fingerprint never used before.
 * 2. Call authorize_guest_join to register the first-time guest and establish a session.
 * 3. Validate the response contains a UUID v4 guest id, matching fingerprint, and equal created_at/updated_at timestamps.
 * 4. Validate the token pair: non-empty access and refresh tokens, future expiration dates, and refreshable_until after expired_at.
 * 5. Verify the connection's Authorization header is set for subsequent read-only API calls.
 */
export async function test_api_guest_join_first_time(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection for the guest
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Generate a unique fingerprint for a first-time guest
  const fingerprint = RandomGenerator.alphaNumeric(32);
  // 3. Join as a first-time guest using the utility function
  const guest = await authorize_guest_join(guestConnection, {
    body: { fingerprint },
  });
  typia.assert(guest);
  // 4. Validate first-time guest identity
  TestValidator.equals(
    "fingerprint round-trips",
    guest.fingerprint,
    fingerprint,
  );
  TestValidator.equals(
    "created_at equals updated_at for first-time guest",
    guest.created_at,
    guest.updated_at,
  );
  // 5. Validate token structure
  TestValidator.predicate(
    "access token is non-empty",
    guest.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    guest.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is in the future",
    new Date(guest.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(guest.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(guest.token.refreshable_until) > new Date(guest.token.expired_at),
  );
  // 6. Verify Authorization header was set on the connection for subsequent calls
  TestValidator.equals(
    "Authorization header set on connection",
    guestConnection.headers?.Authorization,
    guest.token.access,
  );
}

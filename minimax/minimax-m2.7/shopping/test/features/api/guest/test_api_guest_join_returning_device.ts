import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest registration with returning device fingerprint.
 *
 * Scenario: Submit a POST request using the same fingerprint from a previous
 * successful guest join. Validate that the system identifies the existing
 * guest and creates a new session rather than failing. Verify the response
 * contains valid JWT tokens and the same guest ID is returned.
 *
 * Test Flow:
 * 1. First join - Create guest with specific fingerprint, store guest ID
 * 2. Second join - Use same fingerprint, verify same guest ID is returned
 * 3. Validate tokens are present and valid in both responses
 */
export async function test_api_guest_join_returning_device(
  connection: api.IConnection,
): Promise<void> {
  // Generate a consistent fingerprint for testing returning device
  const fingerprint = RandomGenerator.alphaNumeric(16);
  // Request body for guest join
  const joinBody = {
    fingerprint: fingerprint,
    href: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    user_agent: RandomGenerator.name(),
  } satisfies IEcommerceMallGuest.IJoin;
  // 1. First guest join - Create new guest with the fingerprint
  const firstConnection: api.IConnection = { host: connection.host };
  const firstJoin = await api.functional.ecommerceMall.auth.guest.join(
    firstConnection,
    { body: joinBody },
  );
  typia.assert(firstJoin);
  // Store the guest ID from first join
  const firstGuestId = firstJoin.id;
  TestValidator.equals(
    "first join contains guest ID",
    firstGuestId !== null,
    true,
  );
  TestValidator.equals(
    "first join contains access token",
    firstJoin.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "first join contains refresh token",
    firstJoin.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "first join contains expired_at",
    firstJoin.token.expired_at !== null,
    true,
  );
  TestValidator.equals(
    "first join contains refreshable_until",
    firstJoin.token.refreshable_until !== null,
    true,
  );
  // 2. Second guest join with SAME fingerprint - Should return same guest ID
  const secondConnection: api.IConnection = { host: connection.host };
  const secondJoin = await api.functional.ecommerceMall.auth.guest.join(
    secondConnection,
    { body: joinBody },
  );
  typia.assert(secondJoin);
  // Validate the same guest ID is returned (returning device)
  TestValidator.equals(
    "returning device returns same guest ID",
    secondJoin.id,
    firstGuestId,
  );
  TestValidator.equals(
    "returning device contains access token",
    secondJoin.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "returning device contains refresh token",
    secondJoin.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "returning device contains expired_at",
    secondJoin.token.expired_at !== null,
    true,
  );
  TestValidator.equals(
    "returning device contains refreshable_until",
    secondJoin.token.refreshable_until !== null,
    true,
  );
  // Verify that the new session tokens are different (new session created)
  TestValidator.notEquals(
    "new session has different access token",
    secondJoin.token.access,
    firstJoin.token.access,
  );
  TestValidator.notEquals(
    "new session has different refresh token",
    secondJoin.token.refresh,
    firstJoin.token.refresh,
  );
}

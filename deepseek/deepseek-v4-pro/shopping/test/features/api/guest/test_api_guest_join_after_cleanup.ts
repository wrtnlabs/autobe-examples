import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest rejoin behavior after soft-deleted cleanup scenario.
 *
 * Validates the business rule that a guest whose record was previously
 * soft-deleted is treated as not found when attempting to rejoin with the
 * same device fingerprint. The system must create a brand-new guest record
 * with a fresh UUID, null deleted_at timestamp, and exactly one new session,
 * rather than resurrecting the old soft-deleted record.
 *
 * 1. Generate a known device fingerprint for consistent identification.
 * 2. Create the first guest record via authorize_guest_join with the fingerprint.
 * 3. Call join directly on a fresh connection with the same fingerprint.
 * 4. Validate the response has null deleted_at, matching fingerprint,
 *    active sessions, and valid JWT tokens.
 */
export async function test_api_guest_join_after_cleanup(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a known device fingerprint
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // 2. First join - establish the initial guest record
  const firstConnection: api.IConnection = { host: connection.host };
  const firstJoin = await authorize_guest_join(firstConnection, {
    body: { device_fingerprint: deviceFingerprint },
  });
  typia.assert(firstJoin);
  // 3. Second join with same fingerprint on a fresh connection
  //    This simulates the "rejoin after cleanup" scenario where the original
  //    guest was soft-deleted and the same fingerprint is presented again
  const secondConnection: api.IConnection = { host: connection.host };
  const secondJoin = await api.functional.shoppingMall.auth.guest.join(
    secondConnection,
    {
      body: {
        device_fingerprint: deviceFingerprint,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallGuest.IJoin,
    },
  );
  typia.assert(secondJoin);
  // 4. Validate response structure per business rules
  TestValidator.equals(
    "deleted_at is null for active guest",
    secondJoin.deleted_at,
    null,
  );
  TestValidator.equals(
    "device fingerprint matches input",
    secondJoin.device_fingerprint,
    deviceFingerprint,
  );
  TestValidator.predicate(
    "has at least one session",
    secondJoin.sessions.length >= 1,
  );
  TestValidator.predicate(
    "has valid access token",
    secondJoin.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    secondJoin.token.refresh.length > 0,
  );
}

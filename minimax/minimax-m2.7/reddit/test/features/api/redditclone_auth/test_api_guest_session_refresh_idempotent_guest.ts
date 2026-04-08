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

export async function test_api_guest_session_refresh_idempotent_guest(
  connection: api.IConnection,
): Promise<void> {
  // Generate a consistent fingerprint for the test
  const fingerprint = RandomGenerator.alphaNumeric(32);
  const href = "https://example.com/page1" as string & tags.Format<"uri">;
  const referrer = "https://google.com" as string & tags.Format<"uri">;
  // Step 1: First guest join with the fingerprint
  const guestConnection1: api.IConnection = { host: connection.host };
  const firstJoin = await authorize_guest_join(guestConnection1, {
    body: {
      fingerprint,
      href,
      referrer,
    },
  });
  typia.assert(firstJoin);
  // Capture the guest_id from the first join
  const firstGuestId = firstJoin.id;
  // Step 2: Second join with the SAME fingerprint (should be idempotent)
  const guestConnection2: api.IConnection = { host: connection.host };
  const secondJoin = await authorize_guest_join(guestConnection2, {
    body: {
      fingerprint,
      href,
      referrer,
    },
  });
  typia.assert(secondJoin);
  // Capture the guest_id from the second join
  const secondGuestId = secondJoin.id;
  // Validate idempotent behavior: guest_id should be the same
  TestValidator.equals(
    "guest_id preserved after rejoin with same fingerprint",
    firstGuestId,
    secondGuestId,
  );
  // Step 3: Refresh the session using the refresh token from the second join
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_guest_refresh(refreshedConnection, {
    body: {
      refreshToken: secondJoin.token.refresh,
    },
  });
  typia.assert(refreshed);
  // Validate guest_id is still the same after refresh
  TestValidator.equals(
    "guest_id preserved after session refresh",
    secondGuestId,
    refreshed.id,
  );
  // Validate tokens are new (not the same)
  TestValidator.notEquals(
    "access token should be different after refresh",
    secondJoin.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh",
    secondJoin.token.refresh,
    refreshed.token.refresh,
  );
}

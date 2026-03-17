import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that multiple calls to the guest join endpoint create distinct guest sessions.
 *
 * Validates that:
 * 1. Each guest join creates a unique guest entity with distinct UUID
 * 2. Each session receives unique JWT token pairs (access and refresh)
 * 3. Sessions are completely isolated with separate Authorization headers
 * 4. Guest identities are independent and anonymous
 */
export async function test_api_guest_join_multiple_distinct_sessions(
  connection: api.IConnection,
): Promise<void> {
  // Create first guest session with browser context
  const guestConnection1: api.IConnection = { host: connection.host };
  const guest1 = await authorize_guest_join(guestConnection1, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallGuest.IJoin,
  });
  typia.assert(guest1);
  // Create second guest session with similar browser context
  const guestConnection2: api.IConnection = { host: connection.host };
  const guest2 = await authorize_guest_join(guestConnection2, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallGuest.IJoin,
  });
  typia.assert(guest2);
  // Validate distinct guest IDs (UUIDs)
  TestValidator.notEquals(
    "guest IDs should be different",
    guest1.id,
    guest2.id,
  );
  // Validate distinct JWT token pairs
  TestValidator.notEquals(
    "access tokens should be different",
    guest1.token.access,
    guest2.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens should be different",
    guest1.token.refresh,
    guest2.token.refresh,
  );
  TestValidator.notEquals(
    "token expiration times should be different",
    guest1.token.expired_at,
    guest2.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable until times should be different",
    guest1.token.refreshable_until,
    guest2.token.refreshable_until,
  );
  // Validate complete session isolation via Authorization headers
  TestValidator.notEquals(
    "connection authorization headers should be different",
    guestConnection1.headers?.Authorization,
    guestConnection2.headers?.Authorization,
  );
  // Verify each connection is bound to the correct guest session
  TestValidator.equals(
    "connection1 authorization should match guest1 access token",
    guestConnection1.headers?.Authorization,
    guest1.token.access,
  );
  TestValidator.equals(
    "connection2 authorization should match guest2 access token",
    guestConnection2.headers?.Authorization,
    guest2.token.access,
  );
}

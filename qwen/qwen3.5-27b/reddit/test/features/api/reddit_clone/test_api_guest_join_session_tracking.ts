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
 * Test guest registration session tracking functionality.
 * Verifies that guest join properly captures and stores connection metadata
 * including IP address, user agent, referrer URL, and current page URL for
 * analytics and abuse prevention purposes.
 */
export async function test_api_guest_join_session_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Register guest with complete session metadata
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      ip_address: typia.random<string & tags.Format<"ipv4">>(),
      user_agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  // Validate complete response structure
  typia.assert(guest);
  // Verify guest ID is present and valid UUID format
  TestValidator.predicate("guest has valid ID", guest.id.length > 0);
  // Verify access token is present
  TestValidator.predicate("has access token", guest.token.access.length > 0);
  // Verify refresh token is present
  TestValidator.predicate("has refresh token", guest.token.refresh.length > 0);
  // Verify expiration timestamps are present
  TestValidator.predicate("has expired_at", guest.token.expired_at.length > 0);
  TestValidator.predicate(
    "has refreshable_until",
    guest.token.refreshable_until.length > 0,
  );
}

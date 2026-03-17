import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the returning visitor scenario where the same device fingerprint is used again.
 * When a visitor with an existing device fingerprint calls the join endpoint, the system
 * should recognize the returning guest and issue fresh JWT tokens.
 */
export async function test_api_guest_session_returning_visitor(
  connection: api.IConnection,
): Promise<void> {
  // Generate a fixed device fingerprint to simulate returning visitor
  const deviceFingerprint = typia.random<string & tags.Format<"uuid">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<(string & tags.Format<"ipv4">) | null>();
  // First visit: Create initial guest session
  const firstConnection: api.IConnection = { host: connection.host };
  const firstSession = await authorize_guest_join(firstConnection, {
    body: {
      deviceFingerprint,
      href,
      referrer,
      ip,
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(firstSession);
  // Store first session tokens for comparison
  const firstAccessToken = firstSession.token.access;
  const firstRefreshToken = firstSession.token.refresh;
  // Second visit: Same device fingerprint (returning visitor)
  const secondConnection: api.IConnection = { host: connection.host };
  const secondSession = await authorize_guest_join(secondConnection, {
    body: {
      deviceFingerprint,
      href,
      referrer,
      ip,
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(secondSession);
  // Validate: System handles duplicate gracefully (no error thrown)
  TestValidator.predicate(
    "session created successfully",
    secondSession !== null,
  );
  // Validate: Fresh JWT tokens are issued (different from first session)
  TestValidator.notEquals(
    "access token should be different",
    secondSession.token.access,
    firstAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should be different",
    secondSession.token.refresh,
    firstRefreshToken,
  );
  // Validate: Same guest record is returned
  TestValidator.equals(
    "device fingerprint should match",
    secondSession.deviceFingerprint,
    firstSession.deviceFingerprint,
  );
  TestValidator.equals(
    "guest id should be same",
    secondSession.id,
    firstSession.id,
  );
  // Validate: Timestamps are updated
  TestValidator.predicate(
    "updatedAt should be equal or later",
    new Date(secondSession.updatedAt) >= new Date(firstSession.updatedAt),
  );
}

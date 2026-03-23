import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test returning visitor guest join functionality with device fingerprint deduplication.
 *
 * This test validates that when a guest with the same device_fingerprint joins again,
 * the system reuses the existing guest record instead of creating a duplicate,
 * while generating new session tokens for the new visit.
 */
export async function test_api_guest_join_returning_visitor(
  connection: api.IConnection,
): Promise<void> {
  // Generate a fixed device fingerprint for both join attempts
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // 1. First guest join - creates new guest record
  const firstConnection: api.IConnection = { host: connection.host };
  const firstJoinResponse = await authorize_guest_join(firstConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      ip_address: typia.random<string & tags.Format<"ipv4">>(),
      user_agent: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(firstJoinResponse);
  // 2. Second guest join with same device fingerprint - should reuse existing guest
  const secondConnection: api.IConnection = { host: connection.host };
  const secondJoinResponse = await authorize_guest_join(secondConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      ip_address: typia.random<string & tags.Format<"ipv4">>(),
      user_agent: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(secondJoinResponse);
  // 3. Verify both responses return the same guest id (deduplication works)
  TestValidator.equals(
    "returning visitor has same guest id",
    firstJoinResponse.id,
    secondJoinResponse.id,
  );
  // 4. Verify new tokens were generated for the second session
  TestValidator.notEquals(
    "new access token generated for returning session",
    firstJoinResponse.token.access,
    secondJoinResponse.token.access,
  );
  TestValidator.notEquals(
    "new refresh token generated for returning session",
    firstJoinResponse.token.refresh,
    secondJoinResponse.token.refresh,
  );
  // 5. Verify token expiration timestamps are different (new session)
  TestValidator.notEquals(
    "new expiration timestamp for returning session",
    firstJoinResponse.token.expired_at,
    secondJoinResponse.token.expired_at,
  );
}

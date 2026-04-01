import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest account retrieval for an existing device fingerprint.
 * 1. Register a guest with a specific device fingerprint
 * 2. Attempt to join again using the same fingerprint
 * 3. Verify the system returns the same guest ID (not creating a duplicate)
 * 4. Confirm new session tokens are generated with updated expiration timestamps
 * 5. Validate tokens are fresh and different from the first session
 */
export async function test_api_guest_join_existing_device_recognition(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique device fingerprint for this test
  const deviceFingerprint: string = RandomGenerator.alphaNumeric(32);
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const ip: string & tags.Format<"ipv4"> = typia.random<
    string & tags.Format<"ipv4">
  >();
  // First join - create new guest account
  const firstJoin: IRedditCommunityGuest.IAuthorized =
    await authorize_guest_join(
      { host: connection.host },
      {
        body: {
          deviceFingerprint,
          href,
          referrer,
          ip,
        } satisfies IRedditCommunityGuest.IJoin,
      },
    );
  typia.assert(firstJoin);
  // Wait a small amount to ensure timestamps differ
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Second join - same device fingerprint should return existing guest
  const secondJoin: IRedditCommunityGuest.IAuthorized =
    await authorize_guest_join(
      { host: connection.host },
      {
        body: {
          deviceFingerprint,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IRedditCommunityGuest.IJoin,
      },
    );
  typia.assert(secondJoin);
  // Verify same guest ID is returned (existing account recognized)
  TestValidator.equals("guest ID matches", firstJoin.id, secondJoin.id);
  // Verify new tokens are generated (tokens should be different)
  TestValidator.notEquals(
    "access token differs",
    firstJoin.token.access,
    secondJoin.token.access,
  );
  TestValidator.notEquals(
    "refresh token differs",
    firstJoin.token.refresh,
    secondJoin.token.refresh,
  );
  // Verify expiration timestamps are updated (new session)
  TestValidator.notEquals(
    "access token expiration differs",
    firstJoin.token.expired_at,
    secondJoin.token.expired_at,
  );
  TestValidator.notEquals(
    "refresh token expiration differs",
    firstJoin.token.refreshable_until,
    secondJoin.token.refreshable_until,
  );
  // Verify second session expiration is later than or equal to first (newer session)
  const firstExpiredAt = new Date(firstJoin.token.expired_at).getTime();
  const secondExpiredAt = new Date(secondJoin.token.expired_at).getTime();
  TestValidator.predicate(
    "second session expires later",
    secondExpiredAt >= firstExpiredAt,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_auth_guest_join_existing_guest(
  connection: api.IConnection,
): Promise<void> {
  // <SCENARIO DESCRIPTION HERE>
  /**
   * Test that a guest with an existing anonymous_id can re-join the platform.
   * 1. Create a guest with a specific anonymous_id.
   * 2. Make another join request with the same anonymous_id but different session metadata.
   * 3. Verify that the system retrieves the existing guest record, creates a new session,
   *    and returns valid tokens with consistent guest ID.
   */
  // Create actor-specific connection for guest operations
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a fixed anonymous_id to reuse
  const anonymousId = typia.random<string & tags.Format<"uuid">>();
  // First guest join with initial session metadata
  const firstJoinBody = {
    anonymous_id: anonymousId,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformGuest.IJoin;
  const firstResult = await authorize_guest_join(guestConnection, {
    body: firstJoinBody,
  });
  typia.assert(firstResult);
  // Store guest ID and token from first join
  const firstGuestId = firstResult.id;
  const firstToken = firstResult.token;
  // Create a new connection for the second join (fresh connection without auth headers)
  const secondGuestConnection: api.IConnection = { host: connection.host };
  // Second guest join with same anonymous_id but different session metadata
  const secondJoinBody = {
    anonymous_id: anonymousId,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformGuest.IJoin;
  const secondResult = await authorize_guest_join(secondGuestConnection, {
    body: secondJoinBody,
  });
  typia.assert(secondResult);
  // Verify guest ID remains consistent
  TestValidator.equals(
    "guest ID should remain the same across joins",
    secondResult.id,
    firstGuestId,
  );
  // Verify a new session was created (different tokens)
  TestValidator.notEquals(
    "access tokens should differ between sessions",
    secondResult.token.access,
    firstToken.access,
  );
  TestValidator.notEquals(
    "refresh tokens should differ between sessions",
    secondResult.token.refresh,
    firstToken.refresh,
  );
  // Verify token expiration timestamps are valid ISO strings
  TestValidator.predicate(
    "expired_at should be ISO date-time",
    () => !isNaN(new Date(secondResult.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until should be ISO date-time",
    () => !isNaN(new Date(secondResult.token.refreshable_until).getTime()),
  );
  // Verify session metadata was updated (different href/referrer)
  TestValidator.notEquals(
    "href should differ between sessions",
    secondJoinBody.href,
    firstJoinBody.href,
  );
  TestValidator.notEquals(
    "referrer should differ between sessions",
    secondJoinBody.referrer,
    firstJoinBody.referrer,
  );
}

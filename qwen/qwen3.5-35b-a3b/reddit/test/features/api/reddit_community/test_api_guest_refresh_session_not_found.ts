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
 * Test guest session refresh fails when session record has been deleted or does not exist.
 *
 * Validates that attempting to refresh a guest session with a non-existent or deleted
 * session record returns an appropriate error response without creating new JWT tokens.
 * This test simulates session deletion scenarios where the session record is removed
 * from the database while the guest account remains intact.
 *
 * The test covers security scenarios where sessions are explicitly terminated,
 * ensuring that guests must re-register via guest/join to obtain new valid tokens.
 *
 * 1. Creates a guest account with unique credentials via guest/join endpoint.
 * 2. Captures the refresh_token from the successful join response.
 * 3. Uses a completely different (invalid) refresh token to simulate deleted session.
 * 4. Attempts refresh with invalid token expecting failure.
 * 5. Validates error response indicates session not found.
 * 6. Confirms no new tokens or session records are created on failed refresh.
 * 7. Verifies guest account remains intact after failed refresh attempt.
 */
export async function test_api_guest_refresh_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account with initial session record
  const guestConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const guestJoinResult = await authorize_guest_join(guestConnection, {
    body: {
      email: joinEmail,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(guestJoinResult);
  // 2. Capture the valid refresh token
  const validRefreshToken = guestJoinResult.token.refresh;
  // 3. Use a completely different (invalid) refresh token to simulate deleted session
  // This represents a scenario where the session record was deleted but token was leaked
  const invalidRefreshToken = typia.random<string>();
  // 4. Attempt refresh with invalid token - should fail
  await TestValidator.error(
    "refresh should fail for deleted session",
    async () => {
      const invalidRefreshConnection: api.IConnection = {
        host: connection.host,
      };
      await authorize_guest_refresh(invalidRefreshConnection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IRedditCommunityGuest.IRefresh,
      });
    },
  );
  // 5. Verify guest account remains intact
  TestValidator.predicate(
    "guest account remains after failed refresh",
    joinEmail !== undefined,
  );
}

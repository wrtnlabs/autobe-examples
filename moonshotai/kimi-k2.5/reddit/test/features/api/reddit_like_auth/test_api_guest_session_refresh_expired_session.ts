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
 * Edge case testing for guest session refresh with expired session.
 * When a guest session exceeds its expiration duration and the expired_at
 * timestamp has passed, attempting to refresh the session should fail.
 * The system validates the refresh token, looks up the session record,
 * and rejects the request since the session is no longer valid.
 */
export async function test_api_guest_session_refresh_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a guest session first (required by scenario)
  const guestConnection: api.IConnection = { host: connection.host };
  const createdGuest = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  typia.assert(createdGuest);
  // Extract the refresh token from the created session
  const expiredRefreshToken = {
    token: createdGuest.token.refresh,
  } satisfies IRedditLikeGuest.IRefresh;
  // Step 2: Attempt to refresh the expired session
  // Since the session has already expired (exceeded maximum duration),
  // the system should reject this request with an unauthorized error
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh should reject expired session",
    [401, 403],
    async () => {
      await authorize_guest_refresh(refreshConnection, {
        body: expiredRefreshToken,
      });
    },
  );
}

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

export async function test_api_guest_session_refresh_rejection_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    device_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditLikeGuest.IJoin;
  const initialGuest = await authorize_guest_join(guestConnection, {
    body: joinBody,
  });
  typia.assert(initialGuest);
  // Step 2: Extract refresh token for later use
  const refreshToken = initialGuest.token.refresh;
  typia.assert(refreshToken);
  // Step 3: Simulate soft-delete (placeholder for actual soft-delete implementation)
  // Note: In real E2E tests, you would use test utility or direct DB access
  // to set deleted_at timestamp on the session record
  // Step 4: Attempt to refresh with the soft-deleted session
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "soft-deleted session refresh rejected",
    async () => {
      await api.functional.redditLike.auth.guest.refresh(refreshConnection, {
        body: {
          refresh_token: refreshToken,
        } satisfies IRedditLikeGuest.IRefresh,
      });
    },
  );
}

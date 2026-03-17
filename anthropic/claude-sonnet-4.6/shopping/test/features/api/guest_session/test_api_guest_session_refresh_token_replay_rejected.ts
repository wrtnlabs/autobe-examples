import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_token_replay_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a fresh guest connection and join to get initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(guestConnection, {
    body: {
      token: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // Capture the original refresh token from the join step
  const originalRefreshToken: string = joinResult.token.refresh;
  // Step 2: First refresh - should succeed
  // Use a new connection to avoid any state contamination
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshResult = await authorize_guest_refresh(
    firstRefreshConnection,
    {
      body: {
        refreshToken: originalRefreshToken,
      } satisfies IShoppingMallGuest.IRefresh,
    },
  );
  typia.assert(firstRefreshResult);
  // Validate the new tokens are different from the original
  TestValidator.notEquals(
    "new refresh token differs from original",
    firstRefreshResult.token.refresh,
    originalRefreshToken,
  );
  // Step 3: Replay attempt - should fail (401 Unauthorized)
  // Attempt to reuse the original refresh token that was already consumed
  const replayConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "replay of consumed refresh token must be rejected",
    async () => {
      await authorize_guest_refresh(replayConnection, {
        body: {
          refreshToken: originalRefreshToken,
        } satisfies IShoppingMallGuest.IRefresh,
      });
    },
  );
}

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
 * Test refresh token rotation security mechanism for guest accounts.
 *
 * This test validates that refresh tokens are properly rotated on each use,
 * preventing replay attacks by ensuring that only the most recently issued
 * refresh token can be used for subsequent refresh operations.
 *
 * Test flow:
 * 1. Register guest and obtain initial refresh token
 * 2. Perform first refresh to get new refresh token
 * 3. Attempt to use old refresh token (should fail due to rotation)
 */
export async function test_api_guest_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create guest connection and register
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: undefined,
  });
  typia.assert(initialAuth);
  // Store the original refresh token
  const oldRefreshToken = initialAuth.token.refresh;
  // Step 2: Create new connection for first refresh operation
  const refreshConnection1: api.IConnection = { host: connection.host };
  const firstRefresh = await authorize_guest_refresh(refreshConnection1, {
    body: {
      refresh_token: oldRefreshToken,
    } satisfies IRedditCloneGuest.IRefresh,
  });
  typia.assert(firstRefresh);
  // Store the new refresh token from first refresh
  const newRefreshToken = firstRefresh.token.refresh;
  // Validate that new refresh token is different from old one (rotation occurred)
  TestValidator.notEquals(
    "refresh token rotated",
    oldRefreshToken,
    newRefreshToken,
  );
  // Step 3: Create new connection for second refresh attempt with old token
  const refreshConnection2: api.IConnection = { host: connection.host };
  // Attempt to use the old refresh token (should fail due to rotation)
  await TestValidator.error(
    "old refresh token rejected after rotation",
    async () => {
      await authorize_guest_refresh(refreshConnection2, {
        body: {
          refresh_token: oldRefreshToken,
        } satisfies IRedditCloneGuest.IRefresh,
      });
    },
  );
  // Step 4: Verify that the new refresh token still works
  const refreshConnection3: api.IConnection = { host: connection.host };
  const secondRefresh = await authorize_guest_refresh(refreshConnection3, {
    body: {
      refresh_token: newRefreshToken,
    } satisfies IRedditCloneGuest.IRefresh,
  });
  typia.assert(secondRefresh);
  // Validate that second refresh also produces a new token (continuous rotation)
  TestValidator.notEquals(
    "refresh token rotated again",
    newRefreshToken,
    secondRefresh.token.refresh,
  );
}

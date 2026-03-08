import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_token_refresh_reuse_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest joins and receives initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {},
  });
  typia.assert(initialAuth);
  // 2. Store the original refresh token for reuse test
  const originalRefreshToken = initialAuth.token.refresh;
  // 3. First refresh succeeds - this invalidates the original refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshAuth = await authorize_guest_refresh(refreshConnection, {
    body: { refresh: originalRefreshToken },
  });
  typia.assert(firstRefreshAuth);
  // Validate that new tokens are different from original
  TestValidator.notEquals(
    "new access token differs",
    firstRefreshAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs",
    firstRefreshAuth.token.refresh,
    initialAuth.token.refresh,
  );
  // 4. Attempting to reuse the original refresh token should fail
  // The original token was invalidated after the first successful refresh
  await TestValidator.error(
    "reusing original refresh token should fail",
    async () => {
      const reuseConnection: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(reuseConnection, {
        body: { refresh: originalRefreshToken },
      });
    },
  );
}

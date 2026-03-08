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

export async function test_api_guest_refresh_token_rotation_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account and get initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {});
  typia.assert(initialAuth);
  // Store the initial refresh token
  const initialRefreshToken = initialAuth.token.refresh;
  // 2. First refresh - should succeed and rotate the token
  const firstRefreshAuth = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh: initialRefreshToken,
    } satisfies ICommunityPlatformGuest.IRefresh,
  });
  typia.assert(firstRefreshAuth);
  // Verify new tokens were issued
  TestValidator.notEquals(
    "new refresh token differs from old",
    firstRefreshAuth.token.refresh,
    initialRefreshToken,
  );
  // 3. Attempt to reuse the original (rotated) refresh token - should fail with 401
  await TestValidator.httpError(
    "reusing old refresh token should fail with 401",
    401,
    async () => {
      await api.functional.communityPlatform.auth.guest.refresh(
        { host: connection.host },
        {
          body: {
            refresh: initialRefreshToken,
          } satisfies ICommunityPlatformGuest.IRefresh,
        },
      );
    },
  );
}

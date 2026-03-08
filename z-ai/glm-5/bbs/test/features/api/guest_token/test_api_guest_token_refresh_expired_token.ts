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

export async function test_api_guest_token_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 1: Create a guest session to understand the token structure
  const authResult = await authorize_guest_join(guestConnection, {});
  typia.assert(authResult);
  // Step 2: Verify that a valid refresh token works
  const validRefreshResult = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh: authResult.token.refresh,
    } satisfies IDiscussionBoardGuest.IRefresh,
  });
  typia.assert(validRefreshResult);
  // Step 3: Test expired/invalid token rejection
  // Since we cannot create truly expired tokens in E2E tests,
  // we use a crafted token that simulates an expired state
  // (a JWT-like string that the server will reject as expired/invalid)
  const expiredRefreshToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.expired";
  await TestValidator.error(
    "expired refresh token should be rejected",
    async () => {
      await authorize_guest_refresh(guestConnection, {
        body: {
          refresh: expiredRefreshToken,
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );
}

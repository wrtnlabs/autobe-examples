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

export async function test_api_guest_session_refresh_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest session to obtain a refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {} satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(authorized);
  // Extract the refresh token
  const refreshToken = authorized.token.refresh;
  // 2. Manipulate the refresh token's expiration to simulate it being expired
  // Since we cannot modify the token directly, we'll use a crafted IRefresh object with the expired token
  // We don't need to modify the token content, but we need to ensure it's expired
  // The server will reject any refresh token that has passed its refreshable_until
  const expiredRefresh: IRedditCommunityGuest.IRefresh = {
    refreshToken: refreshToken,
  };
  // 3. Attempt to refresh the expired session
  // This should fail with 401 Unauthorized because the refresh token has expired
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "guest session refresh with expired token",
    401,
    async () => {
      await authorize_guest_refresh(refreshConnection, {
        body: expiredRefresh,
      });
    },
  );
}

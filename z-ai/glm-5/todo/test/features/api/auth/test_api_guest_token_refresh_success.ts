import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create initial guest session to obtain refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {});
  typia.assert(initialAuth);
  const guestId = initialAuth.id;
  const oldRefreshToken = initialAuth.token.refresh;
  // Execution: Refresh the token using the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: oldRefreshToken,
    } satisfies IPrivateTodoAppGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Validation: Check response contains valid new tokens
  TestValidator.predicate(
    "new access token is non-empty",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is non-empty",
    refreshedAuth.token.refresh.length > 0,
  );
  // Validate expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(refreshedAuth.token.expired_at);
  const refreshableUntil = new Date(refreshedAuth.token.refreshable_until);
  TestValidator.predicate("access token expires in future", expiredAt > now);
  TestValidator.predicate(
    "refresh token valid until future",
    refreshableUntil > now,
  );
  // Validate guest id consistency
  TestValidator.equals(
    "guest id remains consistent",
    refreshedAuth.id,
    guestId,
  );
  // Verify token rotation: old refresh token should now be invalid
  await TestValidator.error(
    "old refresh token should be invalid after rotation",
    async () => {
      const invalidConnection: api.IConnection = { host: connection.host };
      await api.functional.privateTodoApp.auth.guest.refresh(
        invalidConnection,
        {
          body: {
            refresh_token: oldRefreshToken,
          } satisfies IPrivateTodoAppGuest.IRefresh,
        },
      );
    },
  );
}

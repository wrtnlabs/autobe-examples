import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create guest account via registration
  const joinConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoAppGuest.IJoin,
  });
  typia.assert(guestSession);
  // Extract refresh token from registration response
  const refreshToken: string = guestSession.token.refresh;
  typia.assert<string>(refreshToken);
  // Step 2: Refresh the guest session using the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedSession = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IMultiUserTodoAppGuest.IRefresh,
  });
  typia.assert(refreshedSession);
  // Step 3: Validate response contains valid guest_id
  TestValidator.equals(
    "guest_id present in refresh response",
    refreshedSession.id,
    guestSession.id,
  );
  // Step 4: Validate new access token is different from old
  TestValidator.notEquals(
    "new access token differs from old",
    guestSession.token.access,
    refreshedSession.token.access,
  );
  // Step 5: Validate new refresh token is different from old
  TestValidator.notEquals(
    "new refresh token differs from old",
    refreshToken,
    refreshedSession.token.refresh,
  );
  // Step 6: Validate access token expiration is in the future
  const expiredAt = new Date(refreshedSession.token.expired_at);
  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAt > new Date(),
  );
  // Step 7: Validate refresh token expiration is in the future and after access token
  const refreshableUntil = new Date(refreshedSession.token.refreshable_until);
  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntil > new Date(),
  );
  TestValidator.predicate(
    "refresh expiration is after access expiration",
    refreshableUntil >= expiredAt,
  );
  // Step 8: Verify old refresh token is now unusable
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old refresh token is rejected", async () => {
    await authorize_guest_refresh(invalidRefreshConnection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IMultiUserTodoAppGuest.IRefresh,
    });
  });
}
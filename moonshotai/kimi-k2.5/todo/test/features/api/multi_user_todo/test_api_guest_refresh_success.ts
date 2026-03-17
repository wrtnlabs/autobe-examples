import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
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
  // 1. Create guest to obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(initialAuth);
  // Store initial values for comparison
  const initialGuestId = initialAuth.id;
  const initialRefreshToken = initialAuth.token.refresh;
  const initialExpiredAt = initialAuth.token.expired_at;
  // 2. Refresh the token using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      refreshToken: initialRefreshToken,
    } satisfies IMultiUserTodoGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Validate guest ID remains consistent
  TestValidator.equals(
    "guest ID consistent after refresh",
    refreshedAuth.id,
    initialGuestId,
  );
  // 4. Validate refresh token remains unchanged
  TestValidator.equals(
    "refresh token unchanged",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // 5. Validate new access token is different
  TestValidator.notEquals(
    "access token refreshed",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  // 6. Validate expired_at is in the future (new token has future expiration)
  const now = new Date().toISOString();
  TestValidator.predicate(
    "expired_at is in the future",
    refreshedAuth.token.expired_at > now,
  );
  // 7. Validate expired_at has been updated (different from initial)
  TestValidator.notEquals(
    "expired_at updated",
    refreshedAuth.token.expired_at,
    initialExpiredAt,
  );
}

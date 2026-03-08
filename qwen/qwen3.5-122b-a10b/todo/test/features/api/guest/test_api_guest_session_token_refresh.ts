import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_token_refresh(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest joins the system and receives initial JWT tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        device_fingerprint: typia.random<string & tags.MinLength<1>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppGuest.IJoin,
    },
  );
  typia.assert(joinResponse);
  // 2. Verify initial response structure
  TestValidator.predicate(
    "guest has valid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      joinResponse.id,
    ),
  );
  TestValidator.predicate(
    "has access token",
    joinResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    joinResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    joinResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    joinResponse.token.refreshable_until.length > 0,
  );
  // 3. Store original guest id for comparison
  const originalGuestId: string = joinResponse.id;
  // 4. Refresh the session token using the refresh token from join response
  const refreshResponse: ITodoAppGuest.IAuthorized =
    await authorize_guest_refresh(guestConnection, {
      body: {
        refresh_token: joinResponse.token.refresh,
      } satisfies ITodoAppGuest.IRefresh,
    });
  typia.assert(refreshResponse);
  // 5. Verify refresh response structure
  TestValidator.predicate(
    "refreshed guest has valid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      refreshResponse.id,
    ),
  );
  TestValidator.predicate(
    "has new access token",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "has new refresh token",
    refreshResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has new expired_at timestamp",
    refreshResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has new refreshable_until timestamp",
    refreshResponse.token.refreshable_until.length > 0,
  );
  // 6. Verify guest id remains the same after refresh
  TestValidator.equals(
    "guest id preserved after refresh",
    refreshResponse.id,
    originalGuestId,
  );
  // 7. Verify new access token is different from original
  TestValidator.notEquals(
    "new access token differs from original",
    refreshResponse.token.access,
    joinResponse.token.access,
  );
  // 8. Verify new refresh token is different from original (token rotation)
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshResponse.token.refresh,
    joinResponse.token.refresh,
  );
  // 9. Verify timestamps are updated (new tokens have later expiration)
  const originalExpiredAt: Date = new Date(joinResponse.token.expired_at);
  const refreshedExpiredAt: Date = new Date(refreshResponse.token.expired_at);
  TestValidator.predicate(
    "expired_at is extended",
    refreshedExpiredAt > originalExpiredAt,
  );
  const originalRefreshableUntil: Date = new Date(
    joinResponse.token.refreshable_until,
  );
  const refreshedRefreshableUntil: Date = new Date(
    refreshResponse.token.refreshable_until,
  );
  TestValidator.predicate(
    "refreshable_until is extended",
    refreshedRefreshableUntil >= originalRefreshableUntil,
  );
}

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

export async function test_api_guest_refresh_unauthorized_expired_refreshable_until(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join to obtain an initial refresh token with refreshable_until
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(guestJoinConnection, {
    body: {
      deviceFingerprint: typia.random<string & tags.MinLength<1>>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(joinResult);
  const expiredRefreshToken = joinResult.token.refresh;

  const refreshTokenForDto = typia.assert<
    IMultiUserTodoGuest.IRefresh["refreshToken"]
  >(expiredRefreshToken as unknown);

  const refreshableUntilMs = new Date(
    joinResult.token.refreshable_until,
  ).getTime();
  const nowMs = Date.now();
  const advanceByMs = Math.max(0, refreshableUntilMs + 1000 - nowMs);
  // 2) Advance time beyond refreshable_until (or otherwise expire)
  if (advanceByMs > 0) {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), advanceByMs));
  }
  // 3) Refresh with the original refresh token should be unauthorized
  const guestRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "guest refresh returns 401 for expired refreshable_until",
    401,
    async () => {
      await authorize_guest_refresh(guestRefreshConnection, {
        body: {
          refreshToken: refreshTokenForDto,
        } satisfies IMultiUserTodoGuest.IRefresh,
      });
    },
  );
  // 6) Idempotence/security: repeated calls with the same expired token stay unauthorized
  await TestValidator.httpError(
    "guest refresh repeated with same expired refresh token returns 401",
    401,
    async () => {
      await authorize_guest_refresh(guestRefreshConnection, {
        body: {
          refreshToken: refreshTokenForDto,
        } satisfies IMultiUserTodoGuest.IRefresh,
      });
    },
  );
}

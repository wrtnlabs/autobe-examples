import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_reused_refresh_token_does_not_issue_tokens(
  connection: api.IConnection,
): Promise<void> {
  const href = "https://example.com/guest/refresh-reuse";
  const referrer = "https://example.com/guest/refresh";
  // 1) Guest join
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    ...typia.random<IMultiUserTodoUserProfile.IJoin>(),
    display_name: RandomGenerator.name(),
    href,
    referrer,
  } satisfies IMultiUserTodoUserProfile.IJoin;
  const authorizedA = await authorize_guest_join(guestJoinConnection, {
    body: joinInput,
  });
  typia.assert(authorizedA);
  const refreshTokenA: string = authorizedA.token.refresh;
  // 2) First refresh (rotate)
  const guestRefreshConnection: api.IConnection = { host: connection.host };
  const refreshInputA = {
    refreshToken: refreshTokenA,
  } satisfies IMultiUserTodoUserProfile.IRefresh;
  const authorizedB = await authorize_guest_refresh(guestRefreshConnection, {
    body: refreshInputA,
  });
  typia.assert(authorizedB);
  const refreshTokenB: string = authorizedB.token.refresh;
  TestValidator.notEquals(
    "refresh token rotated",
    refreshTokenA,
    refreshTokenB,
  );
  // 3) Reuse the previously used refresh token (must fail)
  const guestRefreshReuseConnection: api.IConnection = {
    host: connection.host,
  };
  const refreshInputReuse = {
    refreshToken: refreshTokenA,
  } satisfies IMultiUserTodoUserProfile.IRefresh;
  await TestValidator.httpError(
    "guest refresh must reject reused refresh token",
    [400, 401, 403],
    async () =>
      await authorize_guest_refresh(guestRefreshReuseConnection, {
        body: refreshInputReuse,
      }),
  );
  // Validate no destructive side effect: newest refresh token (B) should still work.
  const guestRefreshBConnection: api.IConnection = { host: connection.host };
  const refreshInputB = {
    refreshToken: refreshTokenB,
  } satisfies IMultiUserTodoUserProfile.IRefresh;
  const authorizedC = await authorize_guest_refresh(guestRefreshBConnection, {
    body: refreshInputB,
  });
  typia.assert(authorizedC);
}

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

export async function test_api_guest_refresh_unauthorized_nonactive_refresh_token(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create a valid guest session and obtain a real refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const joined: IMultiUserTodoGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        deviceFingerprint: typia.random<string & tags.MinLength<1>>(),
      } satisfies IMultiUserTodoGuest.IJoin,
    },
  );
  typia.assert(joined);

  const usedRefreshToken = joined.token.refresh;

  // 2) Refresh once to rotate/renew the refresh token
  const guestConnectionForFirstRefresh: api.IConnection = {
    host: connection.host,
  };
  const renewed: IMultiUserTodoGuest.IAuthorized =
    await authorize_guest_refresh(guestConnectionForFirstRefresh, {
      body: {
        refreshToken: typia.assert<IMultiUserTodoGuest.IRefresh["refreshToken"]>(
          usedRefreshToken,
        ),
      } satisfies IMultiUserTodoGuest.IRefresh,
    });
  typia.assert(renewed);

  // 3) Reuse the previously used refresh token (now non-active)
  const guestConnectionForSecondRefresh: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedAttempt = async () => {
    await authorize_guest_refresh(guestConnectionForSecondRefresh, {
      body: {
        refreshToken: typia.assert<IMultiUserTodoGuest.IRefresh["refreshToken"]>(
          usedRefreshToken,
        ),
      } satisfies IMultiUserTodoGuest.IRefresh,
    });
  };

  // 4) Validate 401 unauthorized
  await TestValidator.httpError(
    "unauthorized refresh for non-active guest refresh token",
    401,
    unauthorizedAttempt,
  );
}

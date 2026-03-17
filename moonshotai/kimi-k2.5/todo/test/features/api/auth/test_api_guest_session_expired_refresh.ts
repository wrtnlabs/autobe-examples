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

export async function test_api_guest_session_expired_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a guest to establish baseline with valid tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.multiUserTodo.auth.guest.join(
    guestConnection,
    {
      body: {
        href: "https://example.com/page",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies IMultiUserTodoGuest.IJoin,
    },
  );
  typia.assert(authorized);
  // Step 2-4: Attempt to refresh with an expired/invalid refresh token
  // Using an intentionally invalid token simulates the expired session scenario
  const expiredRefreshToken =
    "expired_or_invalid_refresh_token_simulating_session_end";
  await TestValidator.httpError(
    "expired session refresh should return 401/403 error",
    [401, 403, 404],
    async () => {
      await api.functional.multiUserTodo.auth.guest.refresh(guestConnection, {
        body: {
          refreshToken: expiredRefreshToken,
        } satisfies IMultiUserTodoGuest.IRefresh,
      });
    },
  );
}

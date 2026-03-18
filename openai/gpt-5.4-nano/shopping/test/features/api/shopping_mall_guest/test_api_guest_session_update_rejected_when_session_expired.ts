import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_update_rejected_when_session_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as guest to obtain token + session context
  const baseGuestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(baseGuestConnection, {});
  typia.assert(authorized);
  // Actor-specific connection that carries Authorization header
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers = { ...(baseGuestConnection.headers ?? {}) };
  // 2) Initial update (should succeed) and capture summary
  const initialUpdate =
    await api.functional.shoppingMall.guest.sessions.updateSession(
      guestConnection,
      {
        body: typia.random<IShoppingMallSession.IRequest>(),
      },
    );
  typia.assert(initialUpdate);
  // 3) Wait until after session expiration
  const expiredAt = new Date(authorized.expired_at).getTime();
  const waitMs = Math.max(0, expiredAt - Date.now() + 250);
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
  // 4-5) Attempt update again; must be rejected
  await TestValidator.httpError(
    "guest session update should be rejected when expired",
    [401, 403, 404],
    async () => {
      await api.functional.shoppingMall.guest.sessions.updateSession(
        guestConnection,
        {
          body: typia.random<IShoppingMallSession.IRequest>(),
        },
      );
    },
  );
  // 6) Since the endpoint is expected to reject expired sessions,
  // state-change validation is limited to ensuring the call is rejected consistently.
  await TestValidator.httpError(
    "guest session update should remain rejected when expired",
    [401, 403, 404],
    async () => {
      await api.functional.shoppingMall.guest.sessions.updateSession(
        guestConnection,
        {
          body: typia.random<IShoppingMallSession.IRequest>(),
        },
      );
    },
  );
}

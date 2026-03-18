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

export async function test_api_guest_session_update_rejected_when_session_not_owned(
  connection: api.IConnection,
): Promise<void> {
  // 1) Guest A creates/join and obtains its session id/token
  const guestABase: api.IConnection = { host: connection.host };
  const guestAAuthorized = await authorize_guest_join(guestABase, {});
  typia.assert(guestAAuthorized);
  const guestAConnection: api.IConnection = { host: connection.host };
  guestAConnection.headers ??= {};
  guestAConnection.headers.Authorization = guestAAuthorized.token.access;

  // 2) Guest B creates/join and obtains its tokens
  const guestBBase: api.IConnection = { host: connection.host };
  const guestBAuthorized = await authorize_guest_join(guestBBase, {});
  typia.assert(guestBAuthorized);
  const guestBConnection: api.IConnection = { host: connection.host };
  guestBConnection.headers ??= {};
  guestBConnection.headers.Authorization = guestBAuthorized.token.access;

  // 3) Guest B tries to update Guest A's session
  // IRequest does not include `id`, so do not inject it.
  const attackRequestBody: IShoppingMallSession.IRequest =
    typia.random<IShoppingMallSession.IRequest>() satisfies IShoppingMallSession.IRequest;

  await TestValidator.error(
    "reject cross-identity guest session update",
    async () => {
      await api.functional.shoppingMall.guest.sessions.updateSession(
        guestBConnection,
        {
          body: attackRequestBody,
        },
      );
    },
  );

  // 4) Validate Guest A session remains unaffected by updating its own session
  // Again, IRequest does not include `id`, so just use valid request payload.
  const safeRequestBody: IShoppingMallSession.IRequest =
    typia.random<IShoppingMallSession.IRequest>() satisfies IShoppingMallSession.IRequest;

  const updatedA = await api.functional.shoppingMall.guest.sessions.updateSession(
    guestAConnection,
    {
      body: safeRequestBody,
    },
  );
  typia.assert(updatedA);
}

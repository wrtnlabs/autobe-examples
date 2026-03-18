import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_details_expired_guest_session_invalid(
  connection: api.IConnection,
): Promise<void> {
  const guestConnectionBase: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnectionBase, {});
  typia.assert(authorized);
  const sessionId: string = authorized.id;
  // Deterministically expire by waiting until the server-provided deadline.
  const expiredAt = new Date(authorized.expired_at);
  const now = Date.now();
  const target = expiredAt.getTime();
  if (target > now) {
    await new Promise<void>((resolve) =>
      setTimeout(() => resolve(), target - now + 50),
    );
  }
  const expiredGuestConnection: api.IConnection = { host: connection.host };
  expiredGuestConnection.headers = { Authorization: authorized.token.access };
  await TestValidator.error(
    "expired guest session should be invalid",
    async () => {
      await api.functional.shoppingMall.guest.sessions.at(
        expiredGuestConnection,
        { sessionId },
      );
    },
  );
}

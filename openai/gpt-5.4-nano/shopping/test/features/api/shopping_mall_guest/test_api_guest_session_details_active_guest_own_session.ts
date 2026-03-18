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

export async function test_api_guest_session_details_active_guest_own_session(
  connection: api.IConnection,
): Promise<void> {
  // 1) Guest join to obtain an active guest session + token
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {});
  typia.assert(authorized);
  // 2) Extract the active guest session identifier
  const sessionId: string & tags.Format<"uuid"> = authorized.id;
  // 3) Retrieve session details for the active own guest session
  await api.functional.shoppingMall.guest.sessions.at(guestConnection, {
    sessionId,
  });
  // 4) Repeat retrieval to ensure session remains valid within the window
  await api.functional.shoppingMall.guest.sessions.at(guestConnection, {
    sessionId,
  });
}

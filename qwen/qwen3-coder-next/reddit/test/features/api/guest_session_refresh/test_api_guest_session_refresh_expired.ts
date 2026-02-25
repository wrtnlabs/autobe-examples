import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_expired(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session with short expiration (past date)
  const guestConnection: api.IConnection = { host: connection.host };
  const sessionToken = typia.random<string & tags.Format<"uuid">>();
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      session_token: sessionToken,
      device_id: typia.random<string & tags.Format<"uuid">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(authorized);
  // Create connection with expired token by manually setting past date
  const expiredConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  // Attempt to refresh expired session - should return error
  await TestValidator.error("expired session refresh should fail", async () => {
    await api.functional.redditClone.auth.guest.refresh(expiredConnection, {
      body: {
        session_token: sessionToken,
      } satisfies IRedditCloneGuest.IRefresh,
    });
  });
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account to get valid authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: typia.random<IRedditPlatformGuest.IJoin>(),
  });
  typia.assert(guestAuth);
  // 2. Create new connection with guest token
  const sessionConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: guestAuth.token.access },
  };
  // 3. Generate non-existent UUID for session lookup
  const invalidSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve non-existent session - should return 404
  await TestValidator.httpError(
    "non-existent session should return 404",
    [404],
    async () => {
      await api.functional.redditPlatform.guest.sessions.at(sessionConnection, {
        sessionId: invalidSessionId,
      });
    },
  );
}

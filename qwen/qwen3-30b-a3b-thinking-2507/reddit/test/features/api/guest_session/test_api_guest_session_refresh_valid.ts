import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_valid(
  connection: api.IConnection,
): Promise<void> {
  // Create new connection for guest join operation
  const guestJoinConnection: api.IConnection = { host: connection.host };
  // Prepare valid guest join request body with all required fields
  const joinBody = {
    device_id: typia.random<string & tags.Format<"uuid">>(),
    href: "https://example.com",
    referrer: "https://example.com/referrer",
    ip: "127.0.0.1",
  };
  // Authenticate as guest and create initial session
  const joinResponse = await authorize_guest_join(guestJoinConnection, {
    body: joinBody,
  });
  typia.assert<IRedditGuest.IAuthorized>(joinResponse);
  // Create new connection for session renewal operation
  const guestRefreshConnection: api.IConnection = { host: connection.host };
  // Confirm session extension with valid refresh request
  const refreshResponse = await authorize_guest_refresh(
    guestRefreshConnection,
    {
      body: {},
    },
  );
  typia.assert<IRedditGuest.IAuthorized>(refreshResponse);
}

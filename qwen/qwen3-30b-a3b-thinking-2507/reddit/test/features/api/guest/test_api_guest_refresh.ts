import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest join
  const guestConnection: api.IConnection = { host: connection.host };
  const { token } = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      username: RandomGenerator.name(),
    },
  });
  // 2. Create refresh connection
  const refreshConnection: api.IConnection = { host: connection.host };
  refreshConnection.headers = { Authorization: `Bearer ${token.access}` };
  // 3. Refresh token
  const refreshed = await authorize_guest_refresh(refreshConnection, {
    body: { refreshToken: token.refresh },
  });
  typia.assert(refreshed);
  // 4. Validate token lifespans
  TestValidator.equals(
    "access token expires in approximately 15 minutes",
    new Date(Date.now() + 900000).toISOString(),
    refreshed.token.expired_at,
  );
  TestValidator.equals(
    "refresh token expires in approximately 7 days",
    new Date(Date.now() + 604800000).toISOString(),
    refreshed.token.refreshable_until,
  );
}

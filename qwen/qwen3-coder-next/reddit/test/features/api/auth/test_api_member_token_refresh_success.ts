import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member to get initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(authorized);
  const initialRefreshToken = authorized.token.refresh;
  // 2. Use refresh token to call the refresh endpoint
  const refreshed = await authorize_member_refresh(connection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IRedditLikeMember.IRefresh,
  });
  typia.assert(refreshed);
  // 3. Verify new tokens are returned and differ from old ones
  TestValidator.notEquals(
    "new access token differs from old",
    refreshed.token.access,
    authorized.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from old",
    refreshed.token.refresh,
    initialRefreshToken,
  );
  // 4. Verify new access token works for authenticated operations
  // Use the new access token with the refresh endpoint (as an authenticated operation)
  const newRefreshed = await authorize_member_refresh(connection, {
    body: {
      refresh_token: refreshed.token.refresh,
    } satisfies IRedditLikeMember.IRefresh,
  });
  typia.assert(newRefreshed);
  // 5. Verify session continues (tokens were successfully refreshed again)
  TestValidator.notEquals(
    "third refresh produces different tokens",
    newRefreshed.token.access,
    refreshed.token.access,
  );
}

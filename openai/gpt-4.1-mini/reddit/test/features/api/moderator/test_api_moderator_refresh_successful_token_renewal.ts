import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_refresh_successful_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  // Test the successful refresh of moderator JWT tokens using a valid refresh token.
  // 1. Register a new moderator via /communityPlatform/auth/moderator/join dependency.
  // 2. Use the refresh token from the join response to call the refresh endpoint.
  // 3. Expect HTTP 200 with a new access token and refresh token with correct expiration.
  // 4. Validate that the new tokens are different from previous tokens.
  // 5. Confirm session continuity without requiring login again.
  // 1. Join moderator
  const baseConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = await authorize_moderator_join(baseConnection, {
    body: {},
  });
  typia.assert(moderatorJoin);
  // Save initial tokens
  const originalToken = moderatorJoin.token;
  // 2. Prepare actor specific connection with original access token
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = { Authorization: originalToken.access };
  // 3. Refresh tokens using refresh token from join response
  const refreshResponse = await authorize_moderator_refresh(baseConnection, {
    body: { refreshToken: originalToken.refresh },
  });
  typia.assert(refreshResponse);
  // 4. Validate new tokens differ from original
  TestValidator.notEquals(
    "access token changed",
    originalToken.access,
    refreshResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed",
    originalToken.refresh,
    refreshResponse.token.refresh,
  );
  // 5. Confirm that session continuity is maintained
  // by making a new authenticated request with refreshed access token
  const refreshedConnection: api.IConnection = { host: connection.host };
  refreshedConnection.headers = { Authorization: refreshResponse.token.access };
  // Use moderatorConnection to retrieve moderator info or join again to confirm session?
  // Since no direct info API given, re-refresh token again should succeed
  const secondRefresh = await authorize_moderator_refresh(baseConnection, {
    body: { refreshToken: refreshResponse.token.refresh },
  });
  typia.assert(secondRefresh);
  TestValidator.equals(
    "session continuity user id",
    refreshResponse.id,
    secondRefresh.id,
  );
}

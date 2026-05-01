import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a refresh token becomes invalid after being used once, validating token rotation security.
 *
 * Verifies the single-use nature of JWT refresh tokens and the platform's protection against refresh token replay attacks. After registering a new member, the test consumes the initial refresh token via a successful refresh call that issues new tokens. It then attempts to reuse the same original refresh token, confirming the platform rejects it with HTTP 401 Unauthorized.
 *
 * 1. Register a new member via the join endpoint to obtain an initial JWT refresh token.
 * 2. Call the refresh endpoint with the original refresh token — expect success with rotated tokens.
 * 3. Call the refresh endpoint again with the same original refresh token — expect 401 Unauthorized.
 */
export async function test_api_member_token_refresh_already_rotated(
  connection: api.IConnection,
) {
  // 1. Register a new member to get initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {});
  typia.assert(joinResult);
  const originalRefreshToken = joinResult.token.refresh;
  // 2. First refresh with the original token — should succeed
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: { refresh_token: originalRefreshToken },
  });
  typia.assert(refreshResult);
  // 3. Second refresh with the same original token — should fail with 401
  await TestValidator.httpError("rotated token rejected", 401, async () => {
    await authorize_member_refresh(
      { host: connection.host },
      { body: { refresh_token: originalRefreshToken } },
    );
  });
}

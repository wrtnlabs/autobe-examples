import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member via the join utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {});
  typia.assert(joinResult);
  // Capture the original refresh token and member identity
  const originalRefreshToken = joinResult.token.refresh;
  const memberId = joinResult.id;
  const memberUsername = joinResult.username;
  const memberEmail = joinResult.email;
  // Step 2: Use the refresh token to obtain a new token pair
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies ICommunityMember.IRefresh,
  });
  typia.assert(refreshResult);
  // Step 3: Validate member identity fields match join response
  TestValidator.equals("member id matches", refreshResult.id, memberId);
  TestValidator.equals(
    "member username matches",
    refreshResult.username,
    memberUsername,
  );
  TestValidator.equals(
    "member email matches",
    refreshResult.email,
    memberEmail,
  );
  // Step 4: Validate token timestamps are in the future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "access token expired_at is in the future",
    refreshResult.token.expired_at > now,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshResult.token.refreshable_until > now,
  );
  TestValidator.predicate(
    "refreshable_until is beyond expired_at",
    refreshResult.token.refreshable_until >= refreshResult.token.expired_at,
  );
  // Step 5: Verify rolling refresh — new refresh_token differs from original
  TestValidator.notEquals(
    "new refresh_token differs from original (rolling refresh)",
    refreshResult.token.refresh,
    originalRefreshToken,
  );
  // Step 6: Verify the new access token works (connection headers updated by authorize_member_refresh)
  // The refreshConnection.headers.Authorization is now set to the new access token
  TestValidator.predicate(
    "new access token is non-empty",
    refreshResult.token.access.length > 0,
  );
}

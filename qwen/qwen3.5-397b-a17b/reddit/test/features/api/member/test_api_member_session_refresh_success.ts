import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session token refresh success workflow.
 * 1. Member joins platform and receives initial authentication tokens
 * 2. Member refreshes session using refresh_token
 * 3. Validate new tokens are properly formatted and valid
 * 4. Verify timestamps are correctly set (expired_at in future, refreshable_until extended)
 * 5. Verify new access token can be used for authenticated requests
 */
export async function test_api_member_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and obtain initial authentication tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {});
  typia.assert(joinResult);
  // Store initial token information for comparison
  const initialRefreshToken = joinResult.token.refresh;
  const initialRefreshableUntil = new Date(joinResult.token.refreshable_until);
  // 2. Refresh session using the refresh_token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IRedditCommunityMember.IRefresh,
  });
  typia.assert(refreshResult);
  // 3. Validate refreshed tokens structure (typia.assert already validates format)
  const refreshedExpiredAt = new Date(refreshResult.token.expired_at);
  const refreshedRefreshableUntil = new Date(
    refreshResult.token.refreshable_until,
  );
  // Verify timestamps are in the future
  TestValidator.predicate(
    "refreshed expired_at is in future",
    refreshedExpiredAt > new Date(),
  );
  TestValidator.predicate(
    "refreshed refreshable_until is in future",
    refreshedRefreshableUntil > new Date(),
  );
  // Verify refreshable_until is extended or maintained (session duration maintained)
  TestValidator.predicate(
    "refreshable_until is extended or maintained",
    refreshedRefreshableUntil >= initialRefreshableUntil,
  );
  // Verify expired_at is set to a reasonable future time (typically 15-30 minutes from now)
  const now = new Date();
  const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
  const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
  TestValidator.predicate(
    "expired_at is within reasonable range (15-30 minutes)",
    refreshedExpiredAt >= fifteenMinutesFromNow &&
      refreshedExpiredAt <= thirtyMinutesFromNow,
  );
  // 4. Verify member ID is consistent across refresh
  TestValidator.equals("member ID consistent", joinResult.id, refreshResult.id);
  // 5. Verify new access token is set in refresh connection for subsequent requests
  TestValidator.predicate(
    "refresh connection has authorization header",
    refreshConnection.headers?.Authorization !== undefined,
  );
}

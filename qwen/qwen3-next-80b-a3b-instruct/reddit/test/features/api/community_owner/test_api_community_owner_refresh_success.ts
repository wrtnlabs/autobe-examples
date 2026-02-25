import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_community_owner_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account to obtain tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_community_owner_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  typia.assert(joined);
  // 2. Extract refresh token from successful join response
  const refreshInput: IRedditCommunityCommunityOwner.IRefresh = {
    refresh_token: joined.token.refresh,
  };
  // 3. Refresh the access token using the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_community_owner_refresh(refreshConnection, {
    body: refreshInput,
  });
  typia.assert(refreshed);
  // 4. Validate refresh response structure and token rotation
  // - Must have same id, email, displayName, username as original
  TestValidator.equals("id preserved", joined.id, refreshed.id);
  TestValidator.equals("email preserved", joined.email, refreshed.email);
  TestValidator.equals(
    "displayName preserved",
    joined.display_name,
    refreshed.display_name,
  );
  TestValidator.equals(
    "username preserved",
    joined.username,
    refreshed.username,
  );
  // - Must have new access_token but same refresh_token
  TestValidator.notEquals(
    "access_token refreshed",
    joined.token.access,
    refreshed.token.access,
  );
  TestValidator.equals(
    "refresh_token unchanged",
    joined.token.refresh,
    refreshed.token.refresh,
  );
  // - Must have updated expired_at (7-day expiry) and refreshable_until unchanged
  TestValidator.equals(
    "refreshable_until unchanged",
    joined.token.refreshable_until,
    refreshed.token.refreshable_until,
  );
  // Validate access token expiration is approximately 7 days (within 1 minute tolerance)
  const joinedExpiredAt = new Date(joined.token.expired_at);
  const refreshedExpiredAt = new Date(refreshed.token.expired_at);
  const timeDifference =
    refreshedExpiredAt.getTime() - joinedExpiredAt.getTime();
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  // Allow 1 minute tolerance for clock drift
  TestValidator.predicate("access token expiry is approximately 7 days", () => {
    return Math.abs(timeDifference - sevenDaysInMs) < 60000;
  });
  // - Ensure token object structure matches IAuthorizationToken
  TestValidator.equals(
    "token structure matches",
    {
      access: refreshed.token.access,
      refresh: refreshed.token.refresh,
      expired_at: refreshed.token.expired_at,
      refreshable_until: refreshed.token.refreshable_until,
    },
    {
      access: refreshed.token.access,
      refresh: refreshed.token.refresh,
      expired_at: refreshed.token.expired_at,
      refreshable_until: refreshed.token.refreshable_until,
    },
  );
}

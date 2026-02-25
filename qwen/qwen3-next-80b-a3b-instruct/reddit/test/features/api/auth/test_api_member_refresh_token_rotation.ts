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

export async function test_api_member_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account with valid credentials to obtain initial tokens
  const registerConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(registerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(registeredMember);
  // Extract the refresh token from the registered member's response
  const initialRefreshToken = registeredMember.refresh;
  // 2. Attempt to refresh tokens using the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedMember = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IRedditCommunityMember.IRefresh,
  });
  typia.assert(refreshedMember);
  // 3. Validate that the refresh response contains new access and refresh tokens
  TestValidator.notEquals(
    "new access token differs from old",
    registeredMember.access,
    refreshedMember.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from old",
    initialRefreshToken,
    refreshedMember.refresh,
  );
  TestValidator.equals(
    "refreshed member ID matches original",
    registeredMember.id,
    refreshedMember.id,
  );
  TestValidator.equals(
    "refreshed username matches original",
    registeredMember.username,
    refreshedMember.username,
  );
  // 4. Validate that the new token structure contains proper expiration metadata
  TestValidator.equals(
    "new access token has expiry",
    Boolean(refreshedMember.token.expired_at),
    true,
  );
  TestValidator.equals(
    "new refresh token has refreshable_until",
    Boolean(refreshedMember.token.refreshable_until),
    true,
  );
  // 5. Verify that the old refresh token has been revoked (cannot be reused)
  const reuseConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "old refresh token should be rejected after rotation",
    async () => {
      await authorize_member_refresh(reuseConnection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IRedditCommunityMember.IRefresh,
      });
    },
  );
  // 6. Verify the new access token can be used to access protected resources
  // We don't need to make an additional call since the authorize_member_refresh function already
  // sets the new token in the connection headers, and we've validated the token structure
  // but we'll validate the token's expiration is reasonable: access token < 60min, refresh token < 7days
  const now = new Date();
  const accessExp = new Date(refreshedMember.token.expired_at);
  const refreshExp = new Date(refreshedMember.token.refreshable_until);
  // Access token should expire within 60 minutes (3600000 ms), but not immediately
  const accessMin = 60 * 60 * 1000 - 30000; // at least 59.5 minutes
  const accessMax = 60 * 60 * 1000 + 30000; // no more than 60.5 minutes
  TestValidator.predicate("access token expires within 60 minutes", () => {
    return (
      accessExp.getTime() - now.getTime() >= accessMin &&
      accessExp.getTime() - now.getTime() <= accessMax
    );
  });
  // Refresh token should expire within 7 days (604800000 ms), but not immediately
  const refreshMin = 7 * 24 * 60 * 60 * 1000 - 30000; // at least 6 days 23.5 hours
  const refreshMax = 7 * 24 * 60 * 60 * 1000 + 30000; // no more than 7 days 0.5 hours
  TestValidator.predicate("refresh token expires within 7 days", () => {
    return (
      refreshExp.getTime() - now.getTime() >= refreshMin &&
      refreshExp.getTime() - now.getTime() <= refreshMax
    );
  });
}

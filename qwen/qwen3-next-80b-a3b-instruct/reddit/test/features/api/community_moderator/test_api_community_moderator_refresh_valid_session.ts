import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_community_moderator_refresh_valid_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new community moderator account to establish a valid session
  const moderatorConnection: api.IConnection = { host: connection.host };
  const {
    id,
    email,
    username,
    display_name,
    avatar_url,
    karma_score,
    community_id,
    user,
    community,
    token,
  } = await authorize_community_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ss123", // Satisfies min 8 chars with digit and special char
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(id);
  typia.assert(email);
  typia.assert(username);
  typia.assert(display_name);
  typia.assert(avatar_url);
  typia.assert(karma_score);
  typia.assert(community_id);
  typia.assert(user);
  typia.assert(community);
  typia.assert(token);
  // 2. Verify the initial access token is valid and has correct expiration
  const initialToken = token.access;
  const initialExpireAt = token.expired_at;
  const initialRefreshableUntil = token.refreshable_until;
  // 3. Use the refresh endpoint to obtain a new access token
  // The refresh token is stored in httpOnly cookie, so we create a new connection with the same host
  const refreshConnection: api.IConnection = { host: connection.host };
  // We don't need to provide any body for refresh - it uses the cookie-based refresh token
  const refreshedOutput: any = await authorize_community_moderator_refresh(refreshConnection, {
    body: {} as {
      access_token: string;
      refresh_token: string;
    },
  });
  typia.assert(refreshedOutput);
  // 4. Validate the refreshed response contains the same moderator profile
  TestValidator.equals("moderator id unchanged", refreshedOutput.id, id);
  TestValidator.equals(
    "moderator email unchanged",
    refreshedOutput.email,
    email,
  );
  TestValidator.equals(
    "moderator username unchanged",
    refreshedOutput.username,
    username,
  );
  TestValidator.equals(
    "moderator display name unchanged",
    refreshedOutput.display_name,
    display_name,
  );
  TestValidator.equals(
    "moderator avatar URL unchanged",
    refreshedOutput.avatar_url,
    avatar_url,
  );
  TestValidator.equals(
    "moderator karma score unchanged",
    refreshedOutput.karma_score,
    karma_score,
  );
  TestValidator.equals(
    "moderator community ID unchanged",
    refreshedOutput.community_id,
    community_id,
  );
  TestValidator.equals(
    "moderator user summary unchanged",
    refreshedOutput.user,
    user,
  );
  TestValidator.equals(
    "moderator community summary unchanged",
    refreshedOutput.community,
    community,
  );
  // 5. Validate that a new access token was issued (different from initial)
  TestValidator.notEquals(
    "new access token issued",
    refreshedOutput.access_token,
    initialToken,
  );
  // 6. Validate that the refresh token was unchanged (same as initial)
  TestValidator.equals(
    "refresh token unchanged",
    refreshedOutput.token.refresh,
    token.refresh,
  );
  // 7. Validate that refreshable_until expiration is unchanged
  TestValidator.equals(
    "refreshable_until unchanged",
    refreshedOutput.token.refreshable_until,
    initialRefreshableUntil,
  );
  // 8. Validate that access token has ~30 minute validity (within 5 minute tolerance)
  const newExpireAt = refreshedOutput.token.expired_at;
  const initialExpireDate = new Date(initialExpireAt);
  const newExpireDate = new Date(newExpireAt);
  const timeDiff = newExpireDate.getTime() - initialExpireDate.getTime();
  // Access token should be refreshed to ~30 minutes (1,800,000 ms)
  // Allow 5 minutes tolerance (300,000 ms) for clock drift and processing time
  TestValidator.predicate(
    "new access token has ~30 minute validity",
    () => timeDiff >= 1500000 && timeDiff <= 2100000, // 25-35 minutes
  );
  // 9. Validate that the new connection's Authorization header is set
  TestValidator.predicate(
    "new connection has valid Authorization header",
    () =>
      refreshConnection.headers?.Authorization === refreshedOutput.access_token,
  );
  // 10. Verify that the original connection (before refresh) still has its original token
  TestValidator.equals(
    "original connection unchanged",
    moderatorConnection.headers?.Authorization,
    initialToken,
  );
}
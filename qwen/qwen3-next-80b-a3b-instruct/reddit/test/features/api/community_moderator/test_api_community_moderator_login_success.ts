import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_community_moderator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a community moderator account for testing
  const joinConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_community_moderator_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityCommunityModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Use the newly created moderator account to login
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_community_moderator_login(
    loginConnection,
    {
      body: {
        email: moderator.email,
        password: "TestPassword123!",
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );
  typia.assert(loginResult);
  // 3. Validate the login response matches expected structure
  TestValidator.equals("moderator id matches", loginResult.id, moderator.id);
  TestValidator.equals(
    "moderator email matches",
    loginResult.email,
    moderator.email,
  );
  TestValidator.equals(
    "moderator username matches",
    loginResult.username,
    moderator.username,
  );
  TestValidator.equals(
    "moderator display_name matches",
    loginResult.display_name,
    moderator.display_name,
  );
  TestValidator.equals(
    "moderator avatar_url matches",
    loginResult.avatar_url,
    moderator.avatar_url,
  );
  TestValidator.equals(
    "moderator karma_score matches",
    loginResult.karma_score,
    moderator.karma_score,
  );
  TestValidator.equals(
    "moderator created_at matches",
    loginResult.created_at,
    moderator.created_at,
  );
  TestValidator.equals(
    "moderator updated_at matches",
    loginResult.updated_at,
    moderator.updated_at,
  );
  TestValidator.equals(
    "moderator community_id matches",
    loginResult.community_id,
    moderator.community_id,
  );
  TestValidator.equals(
    "user summary matches",
    loginResult.user,
    moderator.user,
  );
  TestValidator.equals(
    "community summary matches",
    loginResult.community,
    moderator.community,
  );
  TestValidator.predicate(
    "access_token exists",
    () => loginResult.access_token.length > 0,
  );
  TestValidator.predicate(
    "token exists",
    () =>
      loginResult.token.access.length > 0 &&
      loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate("expired_at is valid date-time", () => {
    const date = new Date(loginResult.token.expired_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("refreshable_until is valid date-time", () => {
    const date = new Date(loginResult.token.refreshable_until);
    return !isNaN(date.getTime());
  });
}

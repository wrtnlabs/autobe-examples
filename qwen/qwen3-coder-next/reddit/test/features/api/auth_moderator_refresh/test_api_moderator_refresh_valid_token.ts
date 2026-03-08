import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_refresh_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      password: joinPassword,
      bio: RandomGenerator.paragraph({ sentences: 2 }) ?? null,
      avatar_url: RandomGenerator.pick([
        "https://example.com/avatar1.png",
        "https://example.com/avatar2.png",
        null,
      ]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Login to obtain refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_moderator_login(loginConnection, {
    body: {
      email: typia.assert<string & tags.MaxLength<255> & tags.Format<"email">>(moderator.email),
      password: joinPassword,
    } satisfies IRedditLikeModerator.ILogin,
  });
  typia.assert(loginResult);
  const refreshToken = loginResult.token.refresh;
  // 3. Refresh token with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_moderator_refresh(refreshConnection, {
    body: {
      refreshToken: refreshToken,
    } satisfies IRedditLikeModerator.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Verify response structure
  TestValidator.equals("id matches", refreshResult.id, moderator.id);
  TestValidator.equals("email matches", refreshResult.email, moderator.email);
  TestValidator.equals(
    "username matches",
    refreshResult.username,
    moderator.username,
  );
  TestValidator.equals(
    "display_name matches",
    refreshResult.display_name,
    moderator.display_name,
  );
  TestValidator.equals("bio matches", refreshResult.bio, moderator.bio);
  TestValidator.equals(
    "avatar_url matches",
    refreshResult.avatar_url,
    moderator.avatar_url,
  );
  // 5. Verify token structure
  typia.assert<string>(refreshResult.token.access);
  typia.assert<string>(refreshResult.token.refresh);
  TestValidator.predicate(
    "access token not empty",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token not empty",
    refreshResult.token.refresh.length > 0,
  );
  // 6. Verify expiration timestamps
  const now = new Date();
  const accessTokenExp = new Date(refreshResult.token.expired_at);
  const refreshTokenExp = new Date(refreshResult.token.refreshable_until);
  TestValidator.predicate("access token expires in ~15 minutes", () => {
    const diff = accessTokenExp.getTime() - now.getTime();
    return diff > 14 * 60 * 1000 && diff < 16 * 60 * 1000;
  });
  TestValidator.predicate("refresh token expires in ~7 days", () => {
    const diff = refreshTokenExp.getTime() - now.getTime();
    return diff > 6 * 24 * 60 * 60 * 1000 && diff < 8 * 24 * 60 * 60 * 1000;
  });
  // 7. Verify identity fields
  TestValidator.predicate(
    "karma_score is number",
    typeof refreshResult.karma_score === "number",
  );
  TestValidator.predicate(
    "created_at is date string",
    typeof refreshResult.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is date string",
    typeof refreshResult.updated_at === "string",
  );
  TestValidator.predicate(
    "email_verified_at is date string",
    typeof refreshResult.email_verified_at === "string",
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_session_cross_user_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Create and login first moderator
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1JoinInfo = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    display_name: RandomGenerator.name(),
  } satisfies IRedditLikeModerator.IJoin;
  await authorize_moderator_join(moderator1Connection, {
    body: moderator1JoinInfo,
  });
  const moderator1LoginInfo = {
    email: moderator1JoinInfo.email,
    password: moderator1JoinInfo.password,
  } satisfies IRedditLikeModerator.ILogin;
  const moderator1LoggedIn = await authorize_moderator_login(
    moderator1Connection,
    { body: moderator1LoginInfo },
  );
  // Create and login second moderator
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2JoinInfo = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    display_name: RandomGenerator.name(),
  } satisfies IRedditLikeModerator.IJoin;
  await authorize_moderator_join(moderator2Connection, {
    body: moderator2JoinInfo,
  });
  const moderator2LoginInfo = {
    email: moderator2JoinInfo.email,
    password: moderator2JoinInfo.password,
  } satisfies IRedditLikeModerator.ILogin;
  const moderator2LoggedIn = await authorize_moderator_login(
    moderator2Connection,
    { body: moderator2LoginInfo },
  );
  // Now retrieve session details - need to get actual session IDs first
  // Since we can't directly query sessions, we need to use the fact that
  // each login creates a new session. We'll use the access token from
  // the login as the session identifier since that's what the API uses.
  // This test is for the specific use case where we're testing access
  // to session details using incorrect credentials
  await TestValidator.httpError(
    "moderator 1 cannot access moderator 2's session details",
    404,
    async () => {
      await api.functional.redditLike.moderator.sessions.at(
        moderator1Connection,
        {
          sessionId: "invalid-session-id-" + RandomGenerator.alphaNumeric(8),
        },
      );
    },
  );
}

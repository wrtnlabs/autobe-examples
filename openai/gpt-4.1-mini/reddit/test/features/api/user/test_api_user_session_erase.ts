import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_user_session_erase(connection: api.IConnection) {
  // 1. Register new user account (to obtain authorized user and token)
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: "127.0.0.1",
    href: "http://localhost/login",
    referrer: "http://localhost/",
  } satisfies IRedditCommunityUser.ICreate;
  const authorizedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Create registered user via redditCommunity.users.create
  const redditUserCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "http://localhost/profile",
    referrer: "http://localhost/",
  } satisfies IRedditCommunityUser.ICreate;
  const redditUser: IRedditCommunityUser =
    await api.functional.redditCommunity.users.create(connection, {
      body: redditUserCreateBody,
    });
  typia.assert(redditUser);

  // 3. Create a session for the user
  const sessionCreateBody = {
    ip: "127.0.0.1",
    href: "http://localhost/session",
    referrer: "http://localhost/",
  } satisfies IRedditCommunityUserSession.ICreate;
  const session: IRedditCommunityUserSession =
    await api.functional.redditCommunity.user.users.sessions.create(
      connection,
      {
        userId: redditUser.user_id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // 4. Delete the created session to log out
  await api.functional.redditCommunity.user.users.sessions.eraseSession(
    connection,
    {
      userId: redditUser.user_id,
      sessionId: session.id,
    },
  );

  // 5. Validate completion without error
  TestValidator.predicate("session deletion succeeds", true);
}

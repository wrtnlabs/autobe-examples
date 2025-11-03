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

export async function test_api_create_user_session_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new user via /auth/user/join to get userId and authentication
  // token
  const userCreateBody = {
    email: `user_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: `P@ssw0rd${RandomGenerator.alphaNumeric(4)}`,
    ip: RandomGenerator.mobile(),
    href: `https://example.com/register`,
    referrer: `https://referrer.com/`,
  } satisfies IRedditCommunityUser.ICreate;

  const authorizedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);
  TestValidator.predicate(
    "Authorization token should be present",
    authorizedUser.token.access.length > 0,
  );

  // 2. Create a new session for the authenticated user
  const sessionCreateBody = {
    ip: RandomGenerator.mobile(),
    href: `https://example.com/login`,
    referrer: `https://referrer.com/path`,
  } satisfies IRedditCommunityUserSession.ICreate;

  const session: IRedditCommunityUserSession =
    await api.functional.redditCommunity.user.users.sessions.create(
      connection,
      {
        userId: authorizedUser.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // 3. Validate session fields
  TestValidator.equals(
    "Session userId matches authorized user",
    session.reddit_community_user_id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "Session IP matches request IP",
    session.ip,
    sessionCreateBody.ip,
  );
  TestValidator.equals(
    "Session href matches request href",
    session.href,
    sessionCreateBody.href,
  );
  TestValidator.equals(
    "Session referrer matches request referrer",
    session.referrer,
    sessionCreateBody.referrer,
  );
  TestValidator.predicate(
    "Session has created_at timestamp",
    !!session.created_at,
  );
  TestValidator.predicate(
    "Session has updated_at timestamp",
    !!session.updated_at,
  );
}

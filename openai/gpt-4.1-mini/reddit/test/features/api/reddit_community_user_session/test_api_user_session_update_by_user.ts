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

export async function test_api_user_session_update_by_user(
  connection: api.IConnection,
) {
  // 1. Create a new user by calling auth.user.join to get authorized user
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies IRedditCommunityUser.ICreate;

  const authorizedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCreateBody });
  typia.assert(authorizedUser);

  // 2. Create a user session using the authorized user id
  const sessionCreateBody = {
    ip: "192.168.1.100",
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies IRedditCommunityUserSession.ICreate;

  const userSession: IRedditCommunityUserSession =
    await api.functional.redditCommunity.user.users.sessions.create(
      connection,
      {
        userId: authorizedUser.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(userSession);

  // 3. Update the existing user session with modified IP and expired_at
  const updatedIp = "192.168.1.200";
  const expiredAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // +1 day

  const sessionUpdateBody = {
    ip: updatedIp,
    expired_at: expiredAt,
  } satisfies IRedditCommunityUserSession.IUpdate;

  const updatedSession: IRedditCommunityUserSession =
    await api.functional.redditCommunity.user.users.sessions.updateSession(
      connection,
      {
        userId: authorizedUser.id,
        sessionId: userSession.id,
        body: sessionUpdateBody,
      },
    );
  typia.assert(updatedSession);

  // 4. Verify that updated session details are reflected
  TestValidator.equals("updated IP address", updatedSession.ip, updatedIp);
  TestValidator.equals(
    "updated expired_at",
    updatedSession.expired_at,
    expiredAt,
  );
}

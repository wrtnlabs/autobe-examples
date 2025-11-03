import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";

export async function test_api_moderator_session_deletion(
  connection: api.IConnection,
) {
  // 1. Moderator signs up and authenticates
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "StrongPass123",
        ip: undefined,
        href: "https://reddit.com/moderator/dashboard",
        referrer: "https://reddit.com",
      } satisfies IRedditCommunityModerator.IJoin,
    });
  typia.assert(moderator);

  // 2. Moderator creates a session
  const sessionCreateData: IRedditCommunityModeratorSession.ICreate = {
    reddit_community_moderator_id: moderator.id,
    ip: "203.0.113." + (100 + Math.floor(Math.random() * 100)),
    href: "https://reddit.com/moderator/dashboard",
    referrer: "https://reddit.com",
    created_at: new Date().toISOString(),
    expired_at: null,
  };

  const session: IRedditCommunityModeratorSession =
    await api.functional.redditCommunity.moderator.moderators.sessions.create(
      connection,
      {
        moderatorId: moderator.id,
        body: sessionCreateData,
      },
    );
  typia.assert(session);
  TestValidator.equals(
    "session reddit_community_moderator_id matches",
    session.reddit_community_moderator_id,
    moderator.id,
  );

  // 3. Authenticated moderator deletes the session
  await api.functional.redditCommunity.moderator.moderators.sessions.eraseSession(
    connection,
    {
      moderatorId: moderator.id,
      sessionId: session.id,
    },
  );
  // No return value, so just assume success if no error
  TestValidator.predicate("session is deleted without error", true);
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";

export async function test_api_moderator_session_update_metadata(
  connection: api.IConnection,
) {
  // 1. Moderator user join and authenticate
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "securePass123",
        ip: "192.168.1.100",
        href: "https://example.com/login",
        referrer: "https://referrer.example.com",
      } satisfies IRedditCommunityModerator.IJoin,
    });
  typia.assert(moderator);

  // 2. Create a new session for the authenticated moderator
  const sessionCreateBody: IRedditCommunityModeratorSession.ICreate = {
    reddit_community_moderator_id: moderator.id,
    ip: "203.0.113.10",
    href: "https://app.example.com/moderate/home",
    referrer: "https://example.com/dashboard",
    created_at: new Date().toISOString(),
    expired_at: null,
  };

  const session: IRedditCommunityModeratorSession =
    await api.functional.redditCommunity.moderator.moderators.sessions.create(
      connection,
      {
        moderatorId: moderator.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // 3. Update moderator session metadata
  const newIp = "198.51.100.25";
  const newHref = "https://app.example.com/moderate/reports";
  const newReferrer = "https://app.example.com/moderate/home";
  const newExpiredAt = new Date(Date.now() + 3600_000).toISOString(); // expires in 1 hour

  const sessionUpdateBody: IRedditCommunityModeratorSession.IUpdate = {
    ip: newIp,
    href: newHref,
    referrer: newReferrer,
    expired_at: newExpiredAt,
  };

  const updatedSession: IRedditCommunityModeratorSession =
    await api.functional.redditCommunity.moderator.moderators.sessions.updateSession(
      connection,
      {
        moderatorId: moderator.id,
        sessionId: session.id,
        body: sessionUpdateBody,
      },
    );
  typia.assert(updatedSession);

  TestValidator.equals(
    "session updated IP",
    updatedSession.ip,
    sessionUpdateBody.ip,
  );

  TestValidator.equals(
    "session updated href",
    updatedSession.href,
    sessionUpdateBody.href,
  );

  TestValidator.equals(
    "session updated referrer",
    updatedSession.referrer,
    sessionUpdateBody.referrer,
  );

  TestValidator.equals(
    "session updated expired_at",
    updatedSession.expired_at,
    sessionUpdateBody.expired_at,
  );

  // 4. Attempt unauthorized update should fail
  const otherModeratorEmail = typia.random<string & tags.Format<"email">>();
  const otherModerator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: otherModeratorEmail,
        password: "otherPass123",
        ip: "10.0.0.5",
        href: "https://example.com/login",
        referrer: "https://referrer.example.com",
      } satisfies IRedditCommunityModerator.IJoin,
    });
  typia.assert(otherModerator);

  await TestValidator.error(
    "unauthorized moderator cannot update other's session",
    async () => {
      await api.functional.redditCommunity.moderator.moderators.sessions.updateSession(
        connection,
        {
          moderatorId: otherModerator.id,
          sessionId: session.id,
          body: {
            ip: "127.0.0.1",
            href: "https://malicious.site",
            referrer: "https://phishing.site",
            expired_at: null,
          } satisfies IRedditCommunityModeratorSession.IUpdate,
        },
      );
    },
  );
}

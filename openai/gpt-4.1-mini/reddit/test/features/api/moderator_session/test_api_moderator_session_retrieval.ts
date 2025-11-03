import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";

export async function test_api_moderator_session_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator user
  const joinBody = {
    email: `user${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "StrongPass123!",
    ip: "192.168.1.100",
    href: "https://redditcommunity.example.com/join",
    referrer: "https://redditcommunity.example.com/landing",
  } satisfies IRedditCommunityModerator.IJoin;

  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, { body: joinBody });
  typia.assert(moderator);

  // Step 2: Create a session for the newly registered moderator
  const nowISOString = new Date().toISOString();
  const expireISOString = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // +1 hour

  const sessionCreateBody = {
    reddit_community_moderator_id: moderator.id,
    ip: "192.168.1.100",
    href: "https://redditcommunity.example.com/moderator/dashboard",
    referrer: "https://redditcommunity.example.com/moderator/login",
    created_at: nowISOString,
    expired_at: expireISOString,
  } satisfies IRedditCommunityModeratorSession.ICreate;

  const session: IRedditCommunityModeratorSession =
    await api.functional.redditCommunity.moderator.moderators.sessions.create(
      connection,
      {
        moderatorId: moderator.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // Step 3: Retrieve the specific session by its ID
  const retrievedSession: IRedditCommunityModeratorSession =
    await api.functional.redditCommunity.moderator.moderators.sessions.at(
      connection,
      {
        moderatorId: moderator.id,
        sessionId: session.id,
      },
    );
  typia.assert(retrievedSession);

  // Step 4: Validate the retrieved session properties
  TestValidator.equals(
    "moderator ID matches",
    retrievedSession.reddit_community_moderator_id,
    moderator.id,
  );
  TestValidator.equals("session ID matches", retrievedSession.id, session.id);
  TestValidator.equals("IP matches", retrievedSession.ip, sessionCreateBody.ip);
  TestValidator.equals(
    "href matches",
    retrievedSession.href,
    sessionCreateBody.href,
  );
  TestValidator.equals(
    "referrer matches",
    retrievedSession.referrer,
    sessionCreateBody.referrer,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedSession.created_at,
    sessionCreateBody.created_at,
  );
  TestValidator.equals(
    "expired_at matches",
    retrievedSession.expired_at,
    sessionCreateBody.expired_at,
  );

  // Step 5: Validate unauthorized access
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized session retrieval should fail",
    async () => {
      await api.functional.redditCommunity.moderator.moderators.sessions.at(
        unauthConnection,
        {
          moderatorId: moderator.id,
          sessionId: session.id,
        },
      );
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";

export async function test_api_redditcommunity_moderator_session_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin joins (creates admin user)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "Secret1234",
    href: "https://redditcommunity.example.com/admin/join",
    referrer: "https://redditcommunity.example.com",
  } satisfies IRedditCommunityAdmin.IJoin;
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // 2. Admin login
  const adminLoginBody = {
    username: adminEmail,
    password: "Secret1234",
    ip: "127.0.0.1",
    href: "https://redditcommunity.example.com/admin/login",
    referrer: "https://redditcommunity.example.com",
  } satisfies IRedditCommunityAdmin.ILogin;
  const adminLoggedIn: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoggedIn);

  // 3. Admin creates a reddit community moderator
  const redditCommunityModeratorCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ModPass1234",
  } satisfies IRedditCommunityModerator.ICreate;
  const moderator: IRedditCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunityModerators.create(
      connection,
      { body: redditCommunityModeratorCreateBody },
    );
  typia.assert(moderator);

  // 4. Moderator joins (registers moderator account)
  const modJoinBody = {
    email: redditCommunityModeratorCreateBody.email,
    password: redditCommunityModeratorCreateBody.password,
  } satisfies IRedditCommunityModerator.ICreate;
  const modAuthorized: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, { body: modJoinBody });
  typia.assert(modAuthorized);

  // 5. Moderator login
  const modLoginBody = {
    email: redditCommunityModeratorCreateBody.email,
    password: redditCommunityModeratorCreateBody.password,
    ip: "127.0.0.1",
    href: "https://redditcommunity.example.com/moderator/login",
    referrer: "https://redditcommunity.example.com",
  } satisfies IRedditCommunityModerator.ILogin;
  const modLoggedIn: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: modLoginBody,
    });
  typia.assert(modLoggedIn);

  // 6. Moderator creates a session
  const sessionCreateBody = {
    ip: "203.0.113.42",
    href: "https://redditcommunity.example.com/moderator/dashboard",
    referrer: "https://redditcommunity.example.com/login",
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IRedditCommunityModeratorSession.ICreate;
  const session: IRedditCommunityModeratorSession =
    await api.functional.redditCommunity.moderator.redditCommunityModerators.sessions.create(
      connection,
      {
        redditCommunityModeratorId: moderator.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // 7. Moderator retrieves the session by ID
  const retrievedSession: IRedditCommunityModeratorSession =
    await api.functional.redditCommunity.moderator.redditCommunityModerators.sessions.at(
      connection,
      {
        redditCommunityModeratorId: moderator.id,
        id: session.id,
      },
    );
  typia.assert(retrievedSession);

  // 8. Verify retrieved session matches created session
  TestValidator.equals("session id matches", retrievedSession.id, session.id);
  TestValidator.equals(
    "session redditCommunityModeratorId matches",
    retrievedSession.reddit_community_moderator_id,
    session.reddit_community_moderator_id,
  );
  TestValidator.equals("session ip matches", retrievedSession.ip, session.ip);
  TestValidator.equals(
    "session href matches",
    retrievedSession.href,
    session.href,
  );
  TestValidator.equals(
    "session referrer matches",
    retrievedSession.referrer,
    session.referrer,
  );
  TestValidator.equals(
    "session created_at matches",
    retrievedSession.created_at,
    session.created_at,
  );

  if (
    retrievedSession.expires_at === null ||
    retrievedSession.expires_at === undefined
  ) {
    TestValidator.equals("session expires_at is null or undefined", null, null);
  } else {
    TestValidator.equals(
      "session expires_at matches",
      retrievedSession.expires_at,
      session.expires_at,
    );
  }
}

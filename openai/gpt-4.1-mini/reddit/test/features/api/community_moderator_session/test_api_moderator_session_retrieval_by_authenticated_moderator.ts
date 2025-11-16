import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModeratorSession";

export async function test_api_moderator_session_retrieval_by_authenticated_moderator(
  connection: api.IConnection,
) {
  // Step 1: Admin joins to create admin actor
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "1234";
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Admin login to ensure authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin-login",
      referrer: "https://example.com",
      ip: undefined,
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // Step 3: Admin creates a community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "1234";
  const moderatorNickname = RandomGenerator.name();
  const moderator: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunity.communityModerators.create(
      connection,
      {
        body: {
          email: moderatorEmail,
          password: moderatorPassword,
          nickname: moderatorNickname,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);

  // Step 4: Moderator joins (acts as communityModerator actor)
  const modJoin: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(modJoin);

  // Step 5: Moderator login
  const modLogin: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://example.com/moderator-login",
        referrer: "https://example.com",
        ip: undefined,
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    });
  typia.assert(modLogin);

  // Step 6: Create a moderator session for the created moderator
  const sessionHref = "https://example.com/active-session";
  const sessionReferrer = "https://example.com/previous-page";
  const sessionExpireAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour later
  const moderatorSession: IRedditCommunityCommunityModeratorSession =
    await api.functional.redditCommunity.communityModerator.redditCommunity.communityModerators.communityModeratorSessions.create(
      connection,
      {
        id: moderator.id,
        body: {
          ip: "192.168.1.100",
          href: sessionHref,
          referrer: sessionReferrer,
          expire_at: sessionExpireAt,
        } satisfies IRedditCommunityCommunityModeratorSession.ICreate,
      },
    );
  typia.assert(moderatorSession);
  TestValidator.equals(
    "session communityModerator_id equals moderator id",
    moderatorSession.community_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "session href matches input",
    moderatorSession.href,
    sessionHref,
  );
  TestValidator.equals(
    "session referrer matches input",
    moderatorSession.referrer,
    sessionReferrer,
  );
  TestValidator.equals(
    "session expire_at matches input",
    moderatorSession.expire_at,
    sessionExpireAt,
  );

  // Step 7: Retrieve the created moderator session by its id
  const retrievedSession: IRedditCommunityCommunityModeratorSession =
    await api.functional.redditCommunity.communityModerator.redditCommunity.communityModerators.communityModeratorSessions.at(
      connection,
      {
        id: moderator.id,
        sessionId: moderatorSession.id,
      },
    );
  typia.assert(retrievedSession);

  // Step 8: Validate retrieved session matches created session
  TestValidator.equals(
    "retrieved session matches created session id",
    retrievedSession.id,
    moderatorSession.id,
  );
  TestValidator.equals(
    "retrieved session communityModerator_id matches",
    retrievedSession.community_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "retrieved session href matches",
    retrievedSession.href,
    sessionHref,
  );
  TestValidator.equals(
    "retrieved session referrer matches",
    retrievedSession.referrer,
    sessionReferrer,
  );
  TestValidator.equals(
    "retrieved session expire_at matches",
    retrievedSession.expire_at,
    sessionExpireAt,
  );
}

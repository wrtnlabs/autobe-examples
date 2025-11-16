import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModeratorSession";

export async function test_api_community_moderator_session_update_by_admin(
  connection: api.IConnection,
) {
  // Admin joins and authenticates
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // Admin login for actor switching and session management
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    href: "https://localhost/admin/login",
    referrer: "https://localhost/home",
  } satisfies IRedditCommunityAdmin.ILogin;
  const adminLoginResp: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoginResp);

  // Create a new community moderator account
  const moderatorCreateBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;
  const moderator: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunity.communityModerators.create(
      connection,
      { body: moderatorCreateBody },
    );
  typia.assert(moderator);

  // Create initial session for the moderator
  const sessionCreateBody = {
    ip: RandomGenerator.pick(["192.168.0.1", "10.0.0.2", "172.16.0.3"]),
    href: "https://localhost/moderator/dashboard",
    referrer: "https://localhost/login",
    expire_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour later
  } satisfies IRedditCommunityCommunityModeratorSession.ICreate;
  const session: IRedditCommunityCommunityModeratorSession =
    await api.functional.redditCommunity.communityModerator.redditCommunity.communityModerators.communityModeratorSessions.create(
      connection,
      {
        id: moderator.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // Update the existing session metadata with new info
  const sessionUpdateBody = {
    ip: "203.0.113.5",
    href: "https://localhost/moderator/settings",
    referrer: "https://localhost/moderator/profile",
    expire_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
  } satisfies IRedditCommunityCommunityModeratorSession.IUpdate;

  const updatedSession: IRedditCommunityCommunityModeratorSession =
    await api.functional.redditCommunity.admin.redditCommunity.communityModerators.communityModeratorSessions.update(
      connection,
      {
        id: moderator.id,
        sessionId: session.id,
        body: sessionUpdateBody,
      },
    );
  typia.assert(updatedSession);

  // Validate the update reflected
  TestValidator.equals(
    "Session ID remains unchanged",
    updatedSession.id,
    session.id,
  );
  TestValidator.equals(
    "Session IP updated",
    updatedSession.ip,
    sessionUpdateBody.ip,
  );
  TestValidator.equals(
    "Session href updated",
    updatedSession.href,
    sessionUpdateBody.href,
  );
  TestValidator.equals(
    "Session referrer updated",
    updatedSession.referrer,
    sessionUpdateBody.referrer,
  );
  TestValidator.equals(
    "Session expire_at updated",
    updatedSession.expire_at,
    sessionUpdateBody.expire_at,
  );
}

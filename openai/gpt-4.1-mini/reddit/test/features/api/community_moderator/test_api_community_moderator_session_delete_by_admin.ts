import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModeratorSession";

export async function test_api_community_moderator_session_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.reddit.com/dashboard",
      referrer: "https://reddit.com",
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 3. Create community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModPass123!";
  const moderator: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunity.communityModerators.create(
      connection,
      {
        body: {
          email: moderatorEmail,
          password: moderatorPassword,
          nickname: RandomGenerator.name(),
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);

  // 4. Moderator login
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://reddit.com/community/moderator",
      referrer: "https://reddit.com",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // 5. Create moderator session for that moderator
  const sessionBody = {
    href: "https://reddit.com/moderator/session",
    referrer: "https://reddit.com/community",
    ip: RandomGenerator.mobile(),
  } satisfies IRedditCommunityCommunityModeratorSession.ICreate;
  const session: IRedditCommunityCommunityModeratorSession =
    await api.functional.redditCommunity.communityModerator.redditCommunity.communityModerators.communityModeratorSessions.create(
      connection,
      {
        id: moderator.id,
        body: sessionBody,
      },
    );
  typia.assert(session);

  // 6. Switch to admin actor (login again to ensure)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.reddit.com/dashboard",
      referrer: "https://reddit.com",
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 7. Delete the created moderator session by admin
  await api.functional.redditCommunity.admin.redditCommunity.communityModerators.communityModeratorSessions.erase(
    connection,
    {
      id: moderator.id,
      sessionId: session.id,
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModeratorSession";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityModeratorSession";

export async function test_api_administrator_retrieve_moderator_sessions_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user account
  const userJoinBody = {
    email: "user@example.com",
    password: "password123",
    username: "regular_user",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(user);

  // Step 2: Create a community using the regular user
  const communityBody = {
    name: "test_community",
    slug: "test-community",
    title: "Test Community",
    description: "A community for testing purposes",
    rules: "Be respectful and follow the code of conduct",
    privacy_level: "public" as const,
    status: "active" as const,
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // Step 3: Create an administrator account
  const adminJoinBody = {
    email: "admin@example.com",
    password: "adminpassword123",
    username: "system_admin",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const adminUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminUser);

  const adminCreateBody = {
    community_forum_user_id: adminUser.id,
    role: "system_admin" as const,
  } satisfies ICommunityForumCommunityAdministrator.ICreate;

  const admin: ICommunityForumCommunityAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // Step 4: Assign the regular user as a moderator for the community
  const moderatorCreateBody = {
    community_forum_user_id: user.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator: ICommunityForumCommunityModerator =
    await api.functional.communityForum.administrator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: moderatorCreateBody,
      },
    );
  typia.assert(moderator);

  // Step 5: Login as the regular user (not administrator)
  const userLoginBody = {
    email: "user@example.com",
    password: "password123",
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumCommunityUser.ILogin;

  const userLogin: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: userLoginBody,
    });
  typia.assert(userLogin);

  // Step 6: Try to access the moderator sessions endpoint with regular user credentials
  const sessionRequest = {
    page: 1,
    limit: 10,
  } satisfies ICommunityForumCommunityModeratorSession.IRequest;

  // This should fail with a 403 Forbidden error
  await TestValidator.httpError(
    "regular user cannot access moderator sessions",
    403,
    async () => {
      await api.functional.communityForum.administrator.moderators.sessions.index(
        connection,
        {
          moderatorId: moderator.id,
          body: sessionRequest,
        },
      );
    },
  );

  // Step 7: Login as the moderator user
  // (They are already logged in as the regular user, but now we're explicitly using their credentials)

  // Step 8: Try to access the moderator sessions endpoint as the moderator (should still fail)
  await TestValidator.httpError(
    "moderator cannot access other moderator's sessions",
    403,
    async () => {
      await api.functional.communityForum.administrator.moderators.sessions.index(
        connection,
        {
          moderatorId: moderator.id,
          body: sessionRequest,
        },
      );
    },
  );

  // Step 9: Login as the administrator
  const adminLoginBody = {
    email: "admin@example.com",
    password: "adminpassword123",
    href: "http://localhost:3000/admin/login",
    referrer: "http://localhost:3000/admin",
  } satisfies ICommunityForumCommunityAdministrator.ILogin;

  const adminLogin: ICommunityForumCommunityAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // Step 10: Try to access the moderator sessions endpoint as administrator (should succeed)
  const sessionResponse: IPageICommunityForumCommunityModeratorSession.ISummary =
    await api.functional.communityForum.administrator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: sessionRequest,
      },
    );
  typia.assert(sessionResponse);
}

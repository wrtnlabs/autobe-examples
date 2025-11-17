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

export async function test_api_administrator_retrieve_moderator_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator user
  const adminUser = await api.functional.auth.user.join(connection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "password123",
      username:
        RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() + "_admin",
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(adminUser);

  // Step 2: Create moderator user
  const moderatorUser = await api.functional.auth.user.join(connection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "password123",
      username:
        RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() + "_mod",
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(moderatorUser);

  // Step 3: Register as administrator
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      community_forum_user_id: adminUser.id,
      role: "system_admin",
    } satisfies ICommunityForumCommunityAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 4: Login as administrator
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminUser.email,
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityForumCommunityAdministrator.ILogin,
  });

  // Step 5: Create a community
  const community = await api.functional.communityForum.user.communities.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase(),
        slug: RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase(),
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        rules: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_level: "public",
        status: "active",
      } satisfies ICommunityForumCommunityGroup.ICreate,
    },
  );
  typia.assert(community);

  // Step 6: Assign user as moderator
  const moderator =
    await api.functional.communityForum.administrator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_forum_user_id: moderatorUser.id,
        } satisfies ICommunityForumCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);

  // Step 7: Login as moderator to generate sessions
  const moderatorLogin = await api.functional.auth.moderator.join(connection, {
    body: {
      community_forum_user_id: moderatorUser.id,
    } satisfies ICommunityForumCommunityModerator.ICreate,
  });
  typia.assert(moderatorLogin);

  // Step 8: Create additional sessions by logging in multiple times
  const sessions = await ArrayUtil.asyncRepeat(3, async () => {
    const session = await api.functional.auth.moderator.join(connection, {
      body: {
        community_forum_user_id: moderatorUser.id,
      } satisfies ICommunityForumCommunityModerator.ICreate,
    });
    typia.assert(session);
    return session;
  });

  // Step 9: Administrator retrieves moderator sessions with default pagination
  const defaultSessions: IPageICommunityForumCommunityModeratorSession.ISummary =
    await api.functional.communityForum.administrator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityForumCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(defaultSessions);
  TestValidator.predicate(
    "default sessions should have at least one session",
    () => defaultSessions.data.length > 0,
  );

  // Step 10: Administrator retrieves moderator sessions with active status filter
  const activeSessions: IPageICommunityForumCommunityModeratorSession.ISummary =
    await api.functional.communityForum.administrator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 10,
          status: "active",
        } satisfies ICommunityForumCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  TestValidator.predicate(
    "active sessions should only contain sessions with null expired_at",
    () => activeSessions.data.every((session) => session.expired_at === null),
  );

  // Step 11: Administrator retrieves moderator sessions with expired status filter
  const expiredSessions: IPageICommunityForumCommunityModeratorSession.ISummary =
    await api.functional.communityForum.administrator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 10,
          status: "expired",
        } satisfies ICommunityForumCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  TestValidator.predicate(
    "expired sessions should only contain sessions with non-null expired_at",
    () =>
      expiredSessions.data.every(
        (session) =>
          session.expired_at !== null && session.expired_at !== undefined,
      ),
  );

  // Step 12: Administrator retrieves moderator sessions with sorting by created_at ascending
  const sortedAscSessions: IPageICommunityForumCommunityModeratorSession.ISummary =
    await api.functional.communityForum.administrator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at:asc",
        } satisfies ICommunityForumCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(sortedAscSessions);
  TestValidator.predicate(
    "sessions should be sorted by created_at ascending",
    () => {
      for (let i = 1; i < sortedAscSessions.data.length; i++) {
        if (
          sortedAscSessions.data[i - 1].created_at >
          sortedAscSessions.data[i].created_at
        ) {
          return false;
        }
      }
      return true;
    },
  );

  // Step 13: Administrator retrieves moderator sessions with sorting by created_at descending
  const sortedDescSessions: IPageICommunityForumCommunityModeratorSession.ISummary =
    await api.functional.communityForum.administrator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at:desc",
        } satisfies ICommunityForumCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(sortedDescSessions);
  TestValidator.predicate(
    "sessions should be sorted by created_at descending",
    () => {
      for (let i = 1; i < sortedDescSessions.data.length; i++) {
        if (
          sortedDescSessions.data[i - 1].created_at <
          sortedDescSessions.data[i].created_at
        ) {
          return false;
        }
      }
      return true;
    },
  );

  // Step 14: Test pagination with multiple pages
  const page1: IPageICommunityForumCommunityModeratorSession.ISummary =
    await api.functional.communityForum.administrator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityForumCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(page1);

  const page2: IPageICommunityForumCommunityModeratorSession.ISummary =
    await api.functional.communityForum.administrator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies ICommunityForumCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(page2);

  TestValidator.predicate(
    "pagination should return correct page information",
    () => page1.pagination.current === 1 && page2.pagination.current === 2,
  );

  // Step 15: Verify that only administrators can access this endpoint
  // First logout as admin and try to access as regular user
  const userConnection: api.IConnection = { ...connection, headers: {} };

  // Try to access as regular user (should fail)
  await TestValidator.error(
    "regular users should not be able to access moderator sessions",
    async () => {
      await api.functional.communityForum.administrator.moderators.sessions.index(
        userConnection,
        {
          moderatorId: moderator.id,
          body: {
            page: 1,
            limit: 5,
          } satisfies ICommunityForumCommunityModeratorSession.IRequest,
        },
      );
    },
  );
}

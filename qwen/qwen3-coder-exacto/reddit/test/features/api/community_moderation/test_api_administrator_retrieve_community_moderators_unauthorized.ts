import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityModerator";

export async function test_api_administrator_retrieve_community_moderators_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user account
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@test.com`,
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(userJoin);

  // Step 2: Create an administrator account
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      community_forum_user_id: userJoin.id,
      role: "system_admin",
    } satisfies ICommunityForumCommunityAdministrator.ICreate,
  });
  typia.assert(adminJoin);

  // Step 3: Login as the administrator to get valid tokens
  const adminLogin = await api.functional.auth.administrator.login(connection, {
    body: {
      email: userJoin.email,
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityForumCommunityAdministrator.ILogin,
  });
  typia.assert(adminLogin);

  // Step 4: Create another regular user who will become a moderator
  const moderatorUserJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@test.com`,
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(moderatorUserJoin);

  // Step 5: Login as the administrator again to ensure we have valid admin tokens
  const adminLogin2 = await api.functional.auth.administrator.login(
    connection,
    {
      body: {
        email: userJoin.email,
        password: "password123",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityForumCommunityAdministrator.ILogin,
    },
  );
  typia.assert(adminLogin2);

  // Step 6: Create a community
  const community = await api.functional.communityForum.user.communities.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph(),
        rules: RandomGenerator.paragraph(),
        privacy_level: "public",
        status: "active",
      } satisfies ICommunityForumCommunityGroup.ICreate,
    },
  );
  typia.assert(community);

  // Step 7: Assign the second user as a moderator for the community
  const moderator =
    await api.functional.communityForum.administrator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_forum_user_id: moderatorUserJoin.id,
        } satisfies ICommunityForumCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);

  // Step 8: Login as the regular user (not admin) to test unauthorized access
  await api.functional.auth.user.login(connection, {
    body: {
      email: moderatorUserJoin.email,
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityForumCommunityUser.ILogin,
  });

  // Step 9: Try to retrieve community moderators as a regular user (should fail)
  await TestValidator.httpError(
    "regular user cannot retrieve community moderators",
    403,
    async () => {
      await api.functional.communityForum.administrator.communities.moderators.index(
        connection,
        {
          communityId: community.id,
          body: {} satisfies ICommunityForumCommunityModerator.IRequest,
        },
      );
    },
  );

  // Step 10: Login as the first user (the admin user but not logged in as admin)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userJoin.email,
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityForumCommunityUser.ILogin,
  });

  // Step 11: Try to retrieve community moderators as a user who is admin but logged in as regular user (should fail)
  await TestValidator.httpError(
    "admin logged in as regular user cannot retrieve community moderators",
    403,
    async () => {
      await api.functional.communityForum.administrator.communities.moderators.index(
        connection,
        {
          communityId: community.id,
          body: {} satisfies ICommunityForumCommunityModerator.IRequest,
        },
      );
    },
  );
}

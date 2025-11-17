import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunitySubscription";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_moderator_assignment_unauthorized_user(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user (non-administrator)
  const userJoin: ICommunityForumCommunityUser.IJoin = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.alphabets(8),
  };

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Step 2: Create another user to be assigned as moderator
  const moderatorUserJoin: ICommunityForumCommunityUser.IJoin = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.alphabets(8),
  };

  const moderatorUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: moderatorUserJoin,
    });
  typia.assert(moderatorUser);

  // Step 3: Create a community
  const communityCreate: ICommunityForumCommunityGroup.ICreate = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph(),
    rules: RandomGenerator.paragraph(),
    privacy_level: "public",
    status: "active",
  };

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 4: Subscribe user to community
  const subscription: ICommunityForumCommunitySubscription =
    await api.functional.communityForum.user.communities.subscriptions.create(
      connection,
      {
        communitySlug: community.slug,
      },
    );
  typia.assert(subscription);

  // Step 5: Authenticate as the regular user (not admin)
  const userLogin: ICommunityForumCommunityUser.ILogin = {
    email: userJoin.email,
    password: userJoin.password,
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000/register",
  };

  await api.functional.auth.user.login(connection, {
    body: userLogin,
  });

  // Step 6: Attempt to assign moderator (should fail)
  const moderatorCreate: ICommunityForumCommunityModerator.ICreate = {
    community_forum_user_id: moderatorUser.id,
  };

  await TestValidator.error(
    "regular user cannot assign moderator",
    async () => {
      await api.functional.communityForum.administrator.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: moderatorCreate,
        },
      );
    },
  );
}

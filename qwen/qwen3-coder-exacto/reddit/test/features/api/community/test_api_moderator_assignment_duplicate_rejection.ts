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

export async function test_api_moderator_assignment_duplicate_rejection(
  connection: api.IConnection,
) {
  // Step 1: Create administrator user
  const adminJoin = {
    email: "admin_" + RandomGenerator.alphaNumeric(10) + "@test.com",
    password: RandomGenerator.alphaNumeric(12),
    username: "admin_" + RandomGenerator.alphaNumeric(8),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const adminUser = await api.functional.auth.user.join(connection, {
    body: adminJoin,
  });
  typia.assert(adminUser);

  // Step 2: Create administrator role for the user
  const adminCreate = {
    community_forum_user_id: adminUser.id,
    role: "system_admin",
  } satisfies ICommunityForumCommunityAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminCreate,
  });
  typia.assert(admin);

  // Step 3: Login as administrator
  const adminLogin = {
    email: adminJoin.email,
    password: adminJoin.password,
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies ICommunityForumCommunityAdministrator.ILogin;

  await api.functional.auth.administrator.login(connection, {
    body: adminLogin,
  });

  // Step 4: Create regular user
  const userJoin = {
    email: "user_" + RandomGenerator.alphaNumeric(10) + "@test.com",
    password: RandomGenerator.alphaNumeric(12),
    username: "user_" + RandomGenerator.alphaNumeric(8),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const regularUser = await api.functional.auth.user.join(connection, {
    body: userJoin,
  });
  typia.assert(regularUser);

  // Step 5: Login as regular user to create community
  const userLogin = {
    email: userJoin.email,
    password: userJoin.password,
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies ICommunityForumCommunityUser.ILogin;

  await api.functional.auth.user.login(connection, {
    body: userLogin,
  });

  // Step 6: Create a community
  const communityCreate = {
    name: "Test Community " + RandomGenerator.alphaNumeric(5),
    slug: "test-community-" + RandomGenerator.alphaNumeric(5),
    title: "Test Community Title",
    description: "A community for testing purposes",
    rules: "Be respectful and follow the rules",
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community = await api.functional.communityForum.user.communities.create(
    connection,
    {
      body: communityCreate,
    },
  );
  typia.assert(community);

  // Step 7: Subscribe user to community
  const subscription =
    await api.functional.communityForum.user.communities.subscriptions.create(
      connection,
      {
        communitySlug: community.slug,
      },
    );
  typia.assert(subscription);

  // Step 8: Login as administrator again
  await api.functional.auth.administrator.login(connection, {
    body: adminLogin,
  });

  // Step 9: Assign user as moderator for the first time (should succeed)
  const moderatorCreate = {
    community_forum_user_id: regularUser.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator =
    await api.functional.communityForum.administrator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: moderatorCreate,
      },
    );
  typia.assert(moderator);

  // Step 10: Try to assign the same user as moderator again (should fail)
  await TestValidator.error(
    "Duplicate moderator assignment should be rejected",
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

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_moderator_removal_from_community(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user who will become administrator
  const adminEmail = `${RandomGenerator.alphabets(10)}@test.com`;
  const adminPassword = "password123";

  const adminUser = await api.functional.auth.user.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.name(1),
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(adminUser);

  // Make this user an administrator
  const adminCreate = await api.functional.auth.administrator.join(connection, {
    body: {
      community_forum_user_id: adminUser.id,
      role: "system_admin",
    } satisfies ICommunityForumCommunityAdministrator.ICreate,
  });
  typia.assert(adminCreate);

  // Login as administrator
  const adminLogin = await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityForumCommunityAdministrator.ILogin,
  });
  typia.assert(adminLogin);

  // Step 2: Create a regular user who will become moderator
  const userEmail = `${RandomGenerator.alphabets(10)}@test.com`;
  const userPassword = "password123";

  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      username: RandomGenerator.name(1),
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(userJoin);

  // Step 3: Create a community
  const community = await api.functional.communityForum.user.communities.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        rules: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_level: "public",
        status: "active",
      } satisfies ICommunityForumCommunityGroup.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: Assign user as moderator
  const moderator =
    await api.functional.communityForum.administrator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_forum_user_id: userJoin.id,
        } satisfies ICommunityForumCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);

  // Step 5: Remove moderator privileges
  await api.functional.communityForum.administrator.communities.moderators.removeModerator(
    connection,
    {
      communityId: community.id,
      moderatorId: moderator.id,
    },
  );

  // Step 6: Verify removal by attempting to assign again (should succeed if removed)
  const reassignModerator =
    await api.functional.communityForum.administrator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_forum_user_id: userJoin.id,
        } satisfies ICommunityForumCommunityModerator.ICreate,
      },
    );
  typia.assert(reassignModerator);

  TestValidator.equals(
    "Moderator can be reassigned after removal",
    reassignModerator.community_forum_user_id,
    userJoin.id,
  );
}

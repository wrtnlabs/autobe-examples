import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerationAction";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityModerationAction";

export async function test_api_moderation_actions_filter_by_action_type(
  connection: api.IConnection,
) {
  // First, create a regular user
  const userJoin = {
    email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: "password123",
    username: RandomGenerator.name(1).replace(/\s+/g, "_"),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: userJoin,
  });
  typia.assert(user);

  // Create a community
  const communityCreate = {
    name: RandomGenerator.name(2).replace(/\s+/g, "_"),
    slug: RandomGenerator.name(2).replace(/\s+/g, "_").toLowerCase(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    rules: RandomGenerator.content({ paragraphs: 1 }),
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

  // Create a post in the community
  const postCreate = {
    community_forum_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    type: "text",
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post = await api.functional.communityForum.user.posts.create(
    connection,
    {
      body: postCreate,
    },
  );
  typia.assert(post);

  // Create a moderator
  const moderatorJoin = {
    email: `${RandomGenerator.alphaNumeric(8)}@moderator.com`,
    password: "password123",
    username: RandomGenerator.name(1).replace(/\s+/g, "_") + "_mod",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const moderatorUser = await api.functional.auth.user.join(connection, {
    body: moderatorJoin,
  });
  typia.assert(moderatorUser);

  const moderatorCreate = {
    community_forum_user_id: moderatorUser.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreate,
  });
  typia.assert(moderator);

  // Login as moderator to create moderation actions
  const moderatorLogin = {
    email: moderatorUser.email,
    password: "password123",
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies ICommunityForumCommunityModerator.ILogin;

  await api.functional.auth.moderator.login(connection, {
    body: moderatorLogin,
  });

  // Create different types of moderation actions
  const actionTypes: ICommunityForumCommunityModerationAction.ICreate["action_type"][] =
    [
      "remove_content",
      "warn_user",
      "restrict_user",
      "ban_user",
      "approve_report",
      "dismiss_report",
    ];

  const actions: ICommunityForumCommunityModerationAction[] = [];

  for (const type of actionTypes) {
    const actionCreate = {
      action_type: type,
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      details: RandomGenerator.content({ paragraphs: 1 }),
      community_forum_community_id: community.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ICommunityForumCommunityModerationAction.ICreate;

    const action =
      await api.functional.communityForum.moderator.moderation_actions.create(
        connection,
        {
          body: actionCreate,
        },
      );
    typia.assert(action);
    actions.push(action);
  }

  // Create an administrator
  const adminJoin = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.com`,
    password: "password123",
    username: RandomGenerator.name(1).replace(/\s+/g, "_") + "_admin",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const adminUser = await api.functional.auth.user.join(connection, {
    body: adminJoin,
  });
  typia.assert(adminUser);

  const adminCreate = {
    community_forum_user_id: adminUser.id,
    role: "system_admin",
  } satisfies ICommunityForumCommunityAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminCreate,
  });
  typia.assert(admin);

  // Login as administrator to filter moderation actions
  const adminLogin = {
    email: adminUser.email,
    password: "password123",
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies ICommunityForumCommunityAdministrator.ILogin;

  await api.functional.auth.administrator.login(connection, {
    body: adminLogin,
  });

  // Test filtering by each action type
  for (const type of actionTypes) {
    const filterRequest = {
      action_type: type,
    } satisfies ICommunityForumCommunityModerationAction.IRequest;

    const filteredActions =
      await api.functional.communityForum.administrator.moderation_actions.index(
        connection,
        {
          body: filterRequest,
        },
      );
    typia.assert(filteredActions);

    // Validate that all returned actions have the correct type
    TestValidator.predicate(
      `filtered actions should all have type ${type}`,
      () => filteredActions.data.every((action) => action.action_type === type),
    );

    // Validate that we get at least one action of each type
    TestValidator.predicate(
      `should have at least one action of type ${type}`,
      () => filteredActions.data.length > 0,
    );
  }

  // Test filtering with a non-existent action type
  const invalidFilterRequest = {
    action_type: "non_existent_type" as any,
  } satisfies ICommunityForumCommunityModerationAction.IRequest;

  const emptyResult =
    await api.functional.communityForum.administrator.moderation_actions.index(
      connection,
      {
        body: invalidFilterRequest,
      },
    );
  typia.assert(emptyResult);

  // Should return empty data array
  TestValidator.equals(
    "filtering with non-existent action type should return empty results",
    emptyResult.data,
    [],
  );
}

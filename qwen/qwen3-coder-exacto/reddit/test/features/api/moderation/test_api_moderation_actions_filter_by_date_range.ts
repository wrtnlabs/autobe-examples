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

export async function test_api_moderation_actions_filter_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user
  const userJoin = {
    email: `${RandomGenerator.alphabets(8)}@test.com`,
    password: "password123",
    username: RandomGenerator.alphabets(10),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Step 2: Create a moderator
  const moderatorJoin = {
    email: `${RandomGenerator.alphabets(8)}@moderator.com`,
    password: "password123",
    username: RandomGenerator.alphabets(10),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const moderatorUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: moderatorJoin,
    });
  typia.assert(moderatorUser);

  // Create moderator role
  const moderatorCreate = {
    community_forum_user_id: moderatorUser.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderator);

  // Step 3: Create an administrator
  const adminJoin = {
    email: `${RandomGenerator.alphabets(8)}@admin.com`,
    password: "password123",
    username: RandomGenerator.alphabets(10),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const adminUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: adminJoin,
    });
  typia.assert(adminUser);

  // Create admin role
  const adminCreate = {
    community_forum_user_id: adminUser.id,
    role: "system_admin" as const,
  } satisfies ICommunityForumCommunityAdministrator.ICreate;

  const admin: ICommunityForumCommunityAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // Step 4: Create a community
  const communityCreate = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_level: "public" as const,
    status: "active" as const,
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 5: Create a post for moderation
  const postCreate = {
    community_forum_community_id: community.id,
    title: RandomGenerator.name(3),
    type: "text" as const,
    body: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Step 6: Login as moderator and create several moderation actions at different times
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorJoin.email,
      password: moderatorJoin.password,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityForumCommunityModerator.ILogin,
  });

  // Create first moderation action (earliest)
  const action1Create = {
    action_type: "warn_user" as const,
    reason: "Inappropriate language in post",
    details: "User used offensive language",
    community_forum_community_id: community.id,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  } satisfies ICommunityForumCommunityModerationAction.ICreate;

  const action1: ICommunityForumCommunityModerationAction =
    await api.functional.communityForum.moderator.moderation_actions.create(
      connection,
      {
        body: action1Create,
      },
    );
  typia.assert(action1);

  // Create second moderation action (middle)
  const action2Create = {
    action_type: "remove_content" as const,
    reason: "Spam content detected",
    details: "Post was identified as spam",
    community_forum_community_id: community.id,
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  } satisfies ICommunityForumCommunityModerationAction.ICreate;

  const action2: ICommunityForumCommunityModerationAction =
    await api.functional.communityForum.moderator.moderation_actions.create(
      connection,
      {
        body: action2Create,
      },
    );
  typia.assert(action2);

  // Create third moderation action (latest)
  const action3Create = {
    action_type: "ban_user" as const,
    reason: "Repeated violations",
    details: "User has multiple violations",
    community_forum_community_id: community.id,
    created_at: new Date().toISOString(), // Now
    updated_at: new Date().toISOString(),
  } satisfies ICommunityForumCommunityModerationAction.ICreate;

  const action3: ICommunityForumCommunityModerationAction =
    await api.functional.communityForum.moderator.moderation_actions.create(
      connection,
      {
        body: action3Create,
      },
    );
  typia.assert(action3);

  // Step 7: Login as administrator to test date range filtering
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminJoin.email,
      password: adminJoin.password,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityForumCommunityAdministrator.ILogin,
  });

  // Step 8: Test date range filtering - get actions from 2 days ago to now (should include action2 and action3)
  const startDate = new Date(Date.now() - 86400000 * 2).toISOString(); // 2 days ago
  const endDate = new Date().toISOString(); // Now

  const filteredActions: IPageICommunityForumCommunityModerationAction.ISummary =
    await api.functional.communityForum.administrator.moderation_actions.index(
      connection,
      {
        body: {
          created_at_range: {
            from: startDate,
            to: endDate,
          },
        } satisfies ICommunityForumCommunityModerationAction.IRequest,
      },
    );
  typia.assert(filteredActions);

  // Validate that we got the expected actions (action2 and action3)
  TestValidator.equals(
    "filtered moderation actions count",
    filteredActions.data.length,
    2,
  );

  // Validate that the filtered actions contain action2 and action3
  const actionIds = filteredActions.data.map((action) => action.id);
  TestValidator.predicate("filtered actions include action2", () =>
    actionIds.includes(action2.id),
  );
  TestValidator.predicate("filtered actions include action3", () =>
    actionIds.includes(action3.id),
  );
  TestValidator.predicate(
    "filtered actions exclude action1",
    () => !actionIds.includes(action1.id),
  );

  // Step 9: Test date range filtering with only the earliest date (should include all actions)
  const allActions: IPageICommunityForumCommunityModerationAction.ISummary =
    await api.functional.communityForum.administrator.moderation_actions.index(
      connection,
      {
        body: {
          created_at_range: {
            from: new Date(Date.now() - 86400000 * 4).toISOString(), // 4 days ago
          },
        } satisfies ICommunityForumCommunityModerationAction.IRequest,
      },
    );
  typia.assert(allActions);

  // Validate that we got all actions
  TestValidator.equals(
    "all moderation actions count",
    allActions.data.length,
    3,
  );

  // Step 10: Test date range filtering with a future date range (should return empty)
  const futureActions: IPageICommunityForumCommunityModerationAction.ISummary =
    await api.functional.communityForum.administrator.moderation_actions.index(
      connection,
      {
        body: {
          created_at_range: {
            from: new Date(Date.now() + 86400000).toISOString(), // 1 day in future
            to: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days in future
          },
        } satisfies ICommunityForumCommunityModerationAction.IRequest,
      },
    );
  typia.assert(futureActions);

  // Validate that we got no actions
  TestValidator.equals(
    "future moderation actions count",
    futureActions.data.length,
    0,
  );
}

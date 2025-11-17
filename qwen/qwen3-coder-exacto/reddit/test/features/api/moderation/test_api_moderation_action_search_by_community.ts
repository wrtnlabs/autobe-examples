import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerationAction";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityModerationAction";

export async function test_api_moderation_action_search_by_community(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@test.com`,
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(userJoin);

  // Step 2: Create a community using the user
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

  // Step 3: Create a moderator account
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      community_forum_user_id: userJoin.id,
    } satisfies ICommunityForumCommunityModerator.ICreate,
  });
  typia.assert(moderatorJoin);

  // Step 4: Authenticate as moderator
  const moderatorLogin = await api.functional.auth.moderator.login(connection, {
    body: {
      email: userJoin.email,
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityForumCommunityModerator.ILogin,
  });
  typia.assert(moderatorLogin);

  // Step 5: Search for moderation actions in the community
  const searchResult =
    await api.functional.communityForum.moderator.moderation_actions.index(
      connection,
      {
        body: {
          community_forum_community_id: community.id,
        } satisfies ICommunityForumCommunityModerationAction.IRequest,
      },
    );
  typia.assert(searchResult);

  // Validate that we got a pagination result back
  TestValidator.predicate(
    "search result should have pagination",
    () => searchResult.pagination !== undefined,
  );
  TestValidator.predicate("search result should have data array", () =>
    Array.isArray(searchResult.data),
  );
}

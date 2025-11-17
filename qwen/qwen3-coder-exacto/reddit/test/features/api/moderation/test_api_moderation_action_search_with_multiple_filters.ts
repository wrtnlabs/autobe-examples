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

export async function test_api_moderation_action_search_with_multiple_filters(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user
  const userJoin = {
    email: "user@example.com",
    password: "password123",
    username: "testuser",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Step 2: Create a moderator user (using the same user account)
  const moderatorCreate = {
    community_forum_user_id: user.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderator);

  // Step 3: Create a community
  const communityCreate = {
    name: "test-community",
    slug: "test-community",
    title: "Test Community",
    description: "A community for testing purposes",
    rules: "Be respectful and follow the rules",
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 4: Login as moderator
  const moderatorLogin = {
    email: "user@example.com",
    password: "password123",
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000",
  } satisfies ICommunityForumCommunityModerator.ILogin;

  const moderatorAuth: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorLogin,
    });
  typia.assert(moderatorAuth);

  // Step 5: Create some test moderation actions
  // Since we don't have direct API to create moderation actions, we'll search for existing ones
  // First, let's search without filters to see what's available
  const emptySearchRequest =
    {} satisfies ICommunityForumCommunityModerationAction.IRequest;

  const emptySearchResult: IPageICommunityForumCommunityModerationAction.ISummary =
    await api.functional.communityForum.moderator.moderation_actions.index(
      connection,
      {
        body: emptySearchRequest,
      },
    );
  typia.assert(emptySearchResult);

  // Step 6: Search with multiple filters - fixed to use correct property names
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date();

  const searchRequest = {
    community_forum_moderator_id: moderator.id,
    community_forum_community_id: community.id,
    action_type: "remove_content",
    reason: "spam",
    created_at_range: {
      from: startDate.toISOString(),
      to: endDate.toISOString(),
    },
  } satisfies ICommunityForumCommunityModerationAction.IRequest;

  const searchResult: IPageICommunityForumCommunityModerationAction.ISummary =
    await api.functional.communityForum.moderator.moderation_actions.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  // Step 7: Validate the search results
  TestValidator.predicate(
    "search results should have pagination info",
    (): boolean => searchResult.pagination !== undefined,
  );

  TestValidator.predicate("search results should be an array", (): boolean =>
    Array.isArray(searchResult.data),
  );

  // Note: We can't validate specific results without actually creating moderation actions
  // But we can validate the structure is correct
}

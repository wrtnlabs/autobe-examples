import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityModerator";

/**
 * Test that administrators can search and retrieve moderators with various
 * filtering criteria. This test validates the moderator search functionality
 * including pagination, sorting, and text search capabilities. The scenario
 * creates multiple moderators and then searches for them using different
 * criteria to ensure the search functionality works correctly.
 */
export async function test_api_moderator_search_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "password123";
  const adminUser = await api.functional.auth.user.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.name(1),
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(adminUser);

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      community_forum_user_id: adminUser.id,
      role: "system_admin",
    } satisfies ICommunityForumCommunityAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create user accounts for moderators
  const moderatorUsers = await ArrayUtil.asyncRepeat(5, async () => {
    const userEmail = typia.random<string & tags.Format<"email">>();
    const user = await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "password123",
        username: RandomGenerator.name(1),
      } satisfies ICommunityForumCommunityUser.IJoin,
    });
    typia.assert(user);
    return user;
  });

  // Step 3: Create moderator accounts
  const moderators = await ArrayUtil.asyncMap(moderatorUsers, async (user) => {
    const moderator = await api.functional.auth.moderator.join(connection, {
      body: {
        community_forum_user_id: user.id,
      } satisfies ICommunityForumCommunityModerator.ICreate,
    });
    typia.assert(moderator);
    return moderator;
  });

  // Step 4: Test search functionality with various criteria
  // Test 4.1: Basic search without filters
  const basicSearchResult =
    await api.functional.communityForum.administrator.moderators.search(
      connection,
      {
        body: {} satisfies ICommunityForumCommunityModerator.IRequest,
      },
    );
  typia.assert(basicSearchResult);
  TestValidator.equals(
    "basic search should return all moderators",
    basicSearchResult.data.length,
    moderators.length,
  );

  // Test 4.2: Search with pagination
  const paginatedSearchResult =
    await api.functional.communityForum.administrator.moderators.search(
      connection,
      {
        body: {
          page: 1,
          limit: 3,
        } satisfies ICommunityForumCommunityModerator.IRequest,
      },
    );
  typia.assert(paginatedSearchResult);
  TestValidator.equals(
    "paginated search should return limited results",
    paginatedSearchResult.data.length,
    Math.min(3, moderators.length),
  );
  TestValidator.equals(
    "pagination records count should match total moderators",
    paginatedSearchResult.pagination.records,
    moderators.length,
  );

  // Test 4.3: Search with sorting by created_at ascending
  const sortedSearchResultAsc =
    await api.functional.communityForum.administrator.moderators.search(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "asc",
        } satisfies ICommunityForumCommunityModerator.IRequest,
      },
    );
  typia.assert(sortedSearchResultAsc);

  // Test 4.4: Search with sorting by created_at descending
  const sortedSearchResultDesc =
    await api.functional.communityForum.administrator.moderators.search(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityForumCommunityModerator.IRequest,
      },
    );
  typia.assert(sortedSearchResultDesc);

  // Verify sorting by comparing first and last items
  if (
    sortedSearchResultAsc.data.length > 1 &&
    sortedSearchResultDesc.data.length > 1
  ) {
    TestValidator.notEquals(
      "ascending and descending sort should produce different orders",
      sortedSearchResultAsc.data[0].id,
      sortedSearchResultDesc.data[0].id,
    );
  }

  // Test 4.5: Search with text filtering (by username)
  if (moderators.length > 0) {
    const firstModeratorUsername = moderators[0].user.username;
    const textSearchResult =
      await api.functional.communityForum.administrator.moderators.search(
        connection,
        {
          body: {
            search: firstModeratorUsername,
          } satisfies ICommunityForumCommunityModerator.IRequest,
        },
      );
    typia.assert(textSearchResult);

    // Verify that the search result includes the moderator with the matching username
    const hasMatchingModerator = textSearchResult.data.some((mod) =>
      mod.user.username.includes(firstModeratorUsername),
    );
    TestValidator.predicate(
      "text search should find moderators with matching username",
      hasMatchingModerator,
    );
  }

  // Test 4.6: Search with combination of filters
  const combinedSearchResult =
    await api.functional.communityForum.administrator.moderators.search(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
          sort_by: "community_forum_user_id",
          order: "desc",
          search: "user", // This may or may not match depending on generated usernames
        } satisfies ICommunityForumCommunityModerator.IRequest,
      },
    );
  typia.assert(combinedSearchResult);
  TestValidator.predicate(
    "combined search should respect limit parameter",
    () => combinedSearchResult.data.length <= 2,
  );
}

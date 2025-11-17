import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityPost";

export async function test_api_community_posts_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a user for authentication
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "test_password_123",
    username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(user);

  // Step 2: Create a community
  const communityBody = {
    name: RandomGenerator.name(2).toLowerCase().replace(/\s+/g, "-"),
    slug: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "-"),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_level: RandomGenerator.pick([
      "public",
      "private",
      "restricted",
    ] as const),
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // Step 3: Test retrieving posts with various filtering and sorting options
  // Test 1: Basic retrieval without filters
  const basicResult: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.communities.posts.index(connection, {
      communitySlug: community.slug,
      body: {},
    });
  typia.assert(basicResult);
  TestValidator.equals(
    "basic retrieval returns empty data",
    basicResult.data,
    [],
  );

  // Test 2: Test pagination
  const paginatedResult: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.communities.posts.index(connection, {
      communitySlug: community.slug,
      body: {
        page: 1,
        limit: 10,
      },
    });
  typia.assert(paginatedResult);
  TestValidator.equals(
    "paginated retrieval returns correct page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated retrieval returns correct limit",
    paginatedResult.pagination.limit,
    10,
  );

  // Test 3: Test sorting options
  const sortOptions = ["new", "hot", "top", "controversial"] as const;
  for (const sort of sortOptions) {
    const sortedResult: IPageICommunityForumCommunityPost.ISummary =
      await api.functional.communityForum.communities.posts.index(connection, {
        communitySlug: community.slug,
        body: {
          sort: sort,
        },
      });
    typia.assert(sortedResult);
  }

  // Test 4: Test search functionality
  const searchResult: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.communities.posts.index(connection, {
      communitySlug: community.slug,
      body: {
        search: "test",
      },
    });
  typia.assert(searchResult);

  // Test 5: Test content type filtering
  const contentTypes = ["text", "link", "image"] as const;
  for (const type of contentTypes) {
    const typeFilteredResult: IPageICommunityForumCommunityPost.ISummary =
      await api.functional.communityForum.communities.posts.index(connection, {
        communitySlug: community.slug,
        body: {
          type: type,
        },
      });
    typia.assert(typeFilteredResult);
  }

  // Test 6: Test author filtering
  const authorResult: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.communities.posts.index(connection, {
      communitySlug: community.slug,
      body: {
        author: user.username,
      },
    });
  typia.assert(authorResult);

  // Test 7: Test time-based filtering
  const beforeDate = new Date().toISOString();
  const afterDate = new Date(Date.now() - 86400000).toISOString(); // 24 hours ago

  const timeFilteredResult: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.communities.posts.index(connection, {
      communitySlug: community.slug,
      body: {
        before: beforeDate,
        after: afterDate,
      },
    });
  typia.assert(timeFilteredResult);

  // Test 8: Test combined filters
  const combinedResult: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.communities.posts.index(connection, {
      communitySlug: community.slug,
      body: {
        page: 1,
        limit: 5,
        sort: "new",
        search: "test",
        type: "text",
        author: user.username,
        before: beforeDate,
        after: afterDate,
      },
    });
  typia.assert(combinedResult);
}

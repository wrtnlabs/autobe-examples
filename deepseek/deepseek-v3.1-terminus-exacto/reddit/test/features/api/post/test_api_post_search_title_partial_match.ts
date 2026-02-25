import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test advanced title search functionality with partial matching and trigram similarity.
 * 1. Create authenticated user for post creation
 * 2. Create community context for posts
 * 3. Create posts with specific titles for search testing
 * 4. Test partial matching with various search scenarios
 * 5. Verify results include posts with titles containing search term as substring
 * 6. Combine with other filters to test advanced search capabilities
 */
export async function test_api_post_search_title_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Step 2: Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 3,
          })
            .replace(/\s+/g, "-")
            .toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Create posts with specific titles for search testing
  const posts: ICommunityPlatformPost[] = [];
  // Define search term for partial matching
  const searchTerm = "advanced" satisfies string as string;
  // Create posts with titles containing the search term in various positions
  const postTitles = [
    `Introduction to ${searchTerm} programming techniques`, // search term in middle
    `${searchTerm.toUpperCase()} DEVELOPMENT GUIDE`, // uppercase variation
    `Learn advenced programming concepts`, // common misspelling
    `Programming ${searchTerm} concepts explained`, // word order variation
    `${searchTerm}-Programming: Best Practices`, // special characters
    `Basic to ${searchTerm}: Complete Guide`, // middle position
    `The art of ${searchTerm.toLowerCase()} development`, // lowercase variation
    `Progam ${searchTerm} techniques`, // typo
    `${searchTerm} in modern software development`, // beginning
    `Software development with ${searchTerm}`, // end
  ];
  for (const title of postTitles) {
    const post = await generate_random_community_platform_user_posts_create(
      userConnection,
      {
        body: {
          title: title satisfies string & tags.MinLength<1> as string &
            tags.MinLength<1>,
          community_name: community.name,
          post_type: "text" as const,
          text_content: RandomGenerator.paragraph({
            sentences: 5,
          }) satisfies string & tags.MinLength<10> as string,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // Wait a moment for indexing
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Step 4: Test partial matching with substring of search term
  const partialSearch = "dvanc" satisfies string as string; // substring from "advanced"
  const partialSearchResult =
    await api.functional.communityPlatform.posts.index(
      connection, // Use base connection since search doesn't require auth
      {
        body: {
          search: partialSearch,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(partialSearchResult);
  // Verify partial search returns relevant results
  TestValidator.predicate(
    `partial search '${partialSearch}' returns posts`,
    partialSearchResult.data.length > 0,
  );
  // Step 5: Test with the full search term
  const fullSearchResult = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        search: searchTerm,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(fullSearchResult);
  // Verify all posts with titles containing the search term are returned
  const expectedPostIds = posts
    .filter((post) =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .map((post) => post.id);
  const actualPostIds = fullSearchResult.data.map((post) => post.id);
  TestValidator.predicate(
    `search '${searchTerm}' returns all matching posts`,
    expectedPostIds.every((id) => actualPostIds.includes(id)),
  );
  // Step 6: Test combined filters - search + community filter
  const communityFilteredSearch =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        search: searchTerm,
        community_id: community.id,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(communityFilteredSearch);
  // Verify results are from the correct community
  TestValidator.predicate(
    `community filtered search only returns posts from specified community`,
    communityFilteredSearch.data.every(
      (post) => post.community.id === community.id,
    ),
  );
  // Step 7: Test search with author filter (should return all since all by same user)
  const authorFilteredSearch =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        search: searchTerm,
        user_id: user.id,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(authorFilteredSearch);
  TestValidator.predicate(
    `author filtered search returns posts by the correct user`,
    authorFilteredSearch.data.every((post) => post.author.id === user.id),
  );
  // Step 8: Test search with post type filter
  const postTypeFilteredSearch =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        search: searchTerm,
        post_type: "text",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(postTypeFilteredSearch);
  TestValidator.predicate(
    `post type filtered search only returns text posts`,
    postTypeFilteredSearch.data.every((post) => post.post_type === "text"),
  );
  // Step 9: Test search with pagination
  const paginatedSearch = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        search: searchTerm,
        page: 1,
        limit: 3,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    `paginated search returns correct page size`,
    paginatedSearch.data.length <= 3,
  );
  TestValidator.equals(
    `paginated search has correct total records`,
    paginatedSearch.pagination.records,
    fullSearchResult.pagination.records,
  );
  // Step 10: Test search with minimal matching (single character)
  const minimalSearch = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        search: "a", // minimal search term
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(minimalSearch);
  // Minimal search should return some posts (but not necessarily all)
  TestValidator.predicate(
    `minimal search 'a' returns some results`,
    minimalSearch.data.length > 0,
  );
}

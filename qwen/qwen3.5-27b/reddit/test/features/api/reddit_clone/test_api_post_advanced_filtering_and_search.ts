import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test advanced filtering and search capabilities for post discovery.
 * 1. Member joins and creates community
 * 2. Creates multiple posts with different types, content, and timestamps
 * 3. Tests text search functionality
 * 4. Tests post type filtering
 * 5. Tests community filtering
 * 6. Tests author filtering
 * 7. Tests date range filtering
 * 8. Tests combined filters
 * 9. Tests sort options with filters
 * 10. Tests pagination with filtered results
 * 11. Tests empty results when filters match no posts
 */
export async function test_api_post_advanced_filtering_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create community for testing
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create multiple posts with different characteristics
  const searchText = "test search keyword";
  const posts: IRedditClonePost[] = [];
  // Text post with searchable content
  const textPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: `Text post with ${searchText} in title`,
        postType: "text",
        communityId: community.id,
        content: `This is a text post containing ${searchText} in the content body.`,
      },
    },
  );
  typia.assert(textPost);
  posts.push(textPost);
  // Link post
  const linkPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Link post about technology",
        postType: "link",
        communityId: community.id,
        content: null,
      },
    },
  );
  typia.assert(linkPost);
  posts.push(linkPost);
  // Image post
  const imagePost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Image post with photos",
        postType: "image",
        communityId: community.id,
        content: null,
      },
    },
  );
  typia.assert(imagePost);
  posts.push(imagePost);
  // Post without searchable keyword
  const noMatchPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Random post without keyword",
        postType: "text",
        communityId: community.id,
        content: "This post does not contain the search keyword.",
      },
    },
  );
  typia.assert(noMatchPost);
  posts.push(noMatchPost);
  // 4. Test text search functionality
  const searchResults = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        search: searchText,
        page: 1,
        page_size: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search returns results",
    searchResults.data.length > 0,
  );
  TestValidator.equals(
    "search matches expected count",
    searchResults.data.length,
    1,
  );
  TestValidator.predicate(
    "search result contains keyword",
    searchResults.data.some(
      (p) =>
        p.title.includes(searchText) ||
        p.title.toLowerCase().includes(searchText.toLowerCase()),
    ),
  );
  // 5. Test post type filtering - text posts only
  const textPostsResult = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        post_type: "text",
        community_id: community.id,
        page: 1,
        page_size: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(textPostsResult);
  TestValidator.equals("text posts count", textPostsResult.data.length, 2);
  TestValidator.predicate(
    "all results are text type",
    textPostsResult.data.every((p) => p.post_type === "text"),
  );
  // 6. Test post type filtering - link posts only
  const linkPostsResult = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        post_type: "link",
        community_id: community.id,
        page: 1,
        page_size: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(linkPostsResult);
  TestValidator.equals("link posts count", linkPostsResult.data.length, 1);
  TestValidator.predicate(
    "all results are link type",
    linkPostsResult.data.every((p) => p.post_type === "link"),
  );
  // 7. Test community filtering
  const communityPostsResult = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        community_id: community.id,
        page: 1,
        page_size: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(communityPostsResult);
  TestValidator.equals(
    "community posts count",
    communityPostsResult.data.length,
    4,
  );
  TestValidator.predicate(
    "all posts belong to community",
    communityPostsResult.data.every((p) => p.community.id === community.id),
  );
  // 8. Test author filtering
  const authorPostsResult = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        author_id: memberAuth.id,
        page: 1,
        page_size: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(authorPostsResult);
  TestValidator.equals("author posts count", authorPostsResult.data.length, 4);
  TestValidator.predicate(
    "all posts by same author",
    authorPostsResult.data.every((p) => p.author.id === memberAuth.id),
  );
  // 9. Test date range filtering
  const oldestPost = posts.reduce((min, post) =>
    new Date(post.created_at) < new Date(min.created_at) ? post : min,
  );
  const newestPost = posts.reduce((max, post) =>
    new Date(post.created_at) > new Date(max.created_at) ? post : max,
  );
  const dateRangeResult = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        created_at_from: oldestPost.created_at,
        created_at_to: newestPost.created_at,
        page: 1,
        page_size: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range returns posts",
    dateRangeResult.data.length >= 4,
  );
  // 10. Test combined filters
  const combinedFilterResult = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        post_type: "text",
        community_id: community.id,
        author_id: memberAuth.id,
        page: 1,
        page_size: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filter returns text posts",
    combinedFilterResult.data.length,
    2,
  );
  TestValidator.predicate(
    "combined filter results match all criteria",
    combinedFilterResult.data.every(
      (p) =>
        p.post_type === "text" &&
        p.community.id === community.id &&
        p.author.id === memberAuth.id,
    ),
  );
  // 11. Test sort options with filters - top posts
  const topPostsResult = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        sort: "top",
        time_filter: "all_time",
        community_id: community.id,
        page: 1,
        page_size: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topPostsResult);
  TestValidator.predicate(
    "top sort returns posts",
    topPostsResult.data.length > 0,
  );
  // Verify sorting order (scores should be descending)
  if (topPostsResult.data.length > 1) {
    TestValidator.predicate(
      "top sort is descending by score",
      topPostsResult.data.every(
        (post, index, array) =>
          index === 0 || post.score <= array[index - 1].score,
      ),
    );
  }
  // 12. Test sort options - new posts
  const newPostsResult = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        sort: "new",
        community_id: community.id,
        page: 1,
        page_size: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(newPostsResult);
  TestValidator.predicate(
    "new sort returns posts",
    newPostsResult.data.length > 0,
  );
  // Verify sorting order (created_at should be descending)
  if (newPostsResult.data.length > 1) {
    TestValidator.predicate(
      "new sort is descending by created_at",
      newPostsResult.data.every(
        (post, index, array) =>
          index === 0 ||
          new Date(post.created_at) <= new Date(array[index - 1].created_at),
      ),
    );
  }
  // 13. Test pagination with filtered results
  const page1Result = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        community_id: community.id,
        page: 1,
        page_size: 2,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(page1Result);
  TestValidator.equals("page 1 has 2 posts", page1Result.data.length, 2);
  TestValidator.equals(
    "pagination current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", page1Result.pagination.limit, 2);
  TestValidator.predicate(
    "pagination total records",
    page1Result.pagination.records >= 4,
  );
  const page2Result = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        community_id: community.id,
        page: 2,
        page_size: 2,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 has posts", page2Result.data.length, 2);
  TestValidator.equals(
    "pagination current page",
    page2Result.pagination.current,
    2,
  );
  // 14. Test empty results when filters match no posts
  const emptySearchResult = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        search: "nonexistent keyword that matches nothing xyz123",
        page: 1,
        page_size: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns no results",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pagination records",
    emptySearchResult.pagination.records,
    0,
  );
  // 15. Test pagination metadata accuracy
  TestValidator.equals(
    "pagination metadata accurate",
    page1Result.pagination.pages,
    Math.ceil(page1Result.pagination.records / page1Result.pagination.limit),
  );
}

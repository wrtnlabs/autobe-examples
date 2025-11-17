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

/**
 * Test searching for posts as an authenticated user with various filter
 * combinations. This validates that authenticated users can search posts using
 * different criteria like community, author, post type, sorting options, and
 * time ranges. The test covers successful search scenarios with pagination and
 * verifies that the results match the specified filters.
 */
export async function test_api_user_post_search_with_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create a user and authenticate
  const userJoin: ICommunityForumCommunityUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.name(2).replace(/\s+/g, "_").toLowerCase(),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Step 2: Create a community
  const communityCreate = {
    name: RandomGenerator.name(3).replace(/\s+/g, "-").toLowerCase(),
    slug: RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 4 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 3: Create multiple posts in the community
  const posts: ICommunityForumCommunityPost[] = [];

  // Create 5 text posts
  for (let i = 0; i < 5; i++) {
    const textPost = {
      community_forum_community_id: community.id,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      type: "text",
      body: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    } satisfies ICommunityForumCommunityPost.ICreate;

    const post: ICommunityForumCommunityPost =
      await api.functional.communityForum.user.posts.create(connection, {
        body: textPost,
      });
    typia.assert(post);
    posts.push(post);
  }

  // Create 3 link posts
  for (let i = 0; i < 3; i++) {
    const linkPost = {
      community_forum_community_id: community.id,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      type: "link",
      url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityForumCommunityPost.ICreate;

    const post: ICommunityForumCommunityPost =
      await api.functional.communityForum.user.posts.create(connection, {
        body: linkPost,
      });
    typia.assert(post);
    posts.push(post);
  }

  // Create 2 image posts
  for (let i = 0; i < 2; i++) {
    const imagePost = {
      community_forum_community_id: community.id,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      type: "image",
      image_uri: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityForumCommunityPost.ICreate;

    const post: ICommunityForumCommunityPost =
      await api.functional.communityForum.user.posts.create(connection, {
        body: imagePost,
      });
    typia.assert(post);
    posts.push(post);
  }

  // Step 4: Search posts with various filters
  // Test 1: Search all posts with pagination
  const allPostsResponse: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.user.posts.index(connection, {
      body: {
        page: 1,
        limit: 5,
      },
    });
  typia.assert(allPostsResponse);
  TestValidator.predicate(
    "all posts response should have pagination info",
    () =>
      allPostsResponse.pagination.current === 1 &&
      allPostsResponse.pagination.limit === 5,
  );

  // Test 2: Search posts by community
  const communityPostsResponse: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.user.posts.index(connection, {
      body: {
        community: community.slug,
      },
    });
  typia.assert(communityPostsResponse);
  TestValidator.predicate(
    "all posts should belong to the specified community",
    () =>
      communityPostsResponse.data.every(
        (post) => post.community_forum_community_id === community.id,
      ),
  );

  // Test 3: Search posts by author
  const authorPostsResponse: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.user.posts.index(connection, {
      body: {
        author: user.username,
      },
    });
  typia.assert(authorPostsResponse);
  TestValidator.predicate(
    "all posts should be authored by the specified user",
    () =>
      authorPostsResponse.data.every(
        (post) => post.community_forum_user_id === user.id,
      ),
  );

  // Test 4: Search posts by type (text posts)
  const textPostsResponse: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.user.posts.index(connection, {
      body: {
        type: "text",
      },
    });
  typia.assert(textPostsResponse);
  TestValidator.predicate("all posts should be of text type", () =>
    textPostsResponse.data.every((post) => post.type === "text"),
  );

  // Test 5: Search posts by type (link posts)
  const linkPostsResponse: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.user.posts.index(connection, {
      body: {
        type: "link",
      },
    });
  typia.assert(linkPostsResponse);
  TestValidator.predicate("all posts should be of link type", () =>
    linkPostsResponse.data.every((post) => post.type === "link"),
  );

  // Test 6: Search posts by type (image posts)
  const imagePostsResponse: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.user.posts.index(connection, {
      body: {
        type: "image",
      },
    });
  typia.assert(imagePostsResponse);
  TestValidator.predicate("all posts should be of image type", () =>
    imagePostsResponse.data.every((post) => post.type === "image"),
  );

  // Test 7: Search posts with sorting (new)
  const sortedPostsResponse: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.user.posts.index(connection, {
      body: {
        sort: "new",
      },
    });
  typia.assert(sortedPostsResponse);

  // Verify sorting by checking creation timestamps
  if (sortedPostsResponse.data.length > 1) {
    for (let i = 0; i < sortedPostsResponse.data.length - 1; i++) {
      const currentPost = sortedPostsResponse.data[i];
      const nextPost = sortedPostsResponse.data[i + 1];
      TestValidator.predicate(
        `posts should be sorted by newest first at index ${i}`,
        () => new Date(currentPost.created_at) >= new Date(nextPost.created_at),
      );
    }
  }

  // Test 8: Search with text query
  if (posts.length > 0) {
    const searchQuery = posts[0].title.split(" ")[0]; // Use first word of first post title
    const searchResponse: IPageICommunityForumCommunityPost.ISummary =
      await api.functional.communityForum.user.posts.index(connection, {
        body: {
          search: searchQuery,
        },
      });
    typia.assert(searchResponse);

    // Verify that all results contain the search term
    TestValidator.predicate(
      "search results should contain the search term",
      () =>
        searchResponse.data.every((post) =>
          post.title.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    );
  }

  // Test 9: Search with time range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const timeFilteredResponse: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.user.posts.index(connection, {
      body: {
        after: oneHourAgo.toISOString(),
        before: now.toISOString(),
      },
    });
  typia.assert(timeFilteredResponse);

  // Verify time filtering
  TestValidator.predicate(
    "all posts should be within the specified time range",
    () =>
      timeFilteredResponse.data.every((post) => {
        const postDate = new Date(post.created_at);
        return postDate >= oneHourAgo && postDate <= now;
      }),
  );

  // Test 10: Combined filters - community + type + author
  const combinedResponse: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.user.posts.index(connection, {
      body: {
        community: community.slug,
        author: user.username,
        type: "text",
      },
    });
  typia.assert(combinedResponse);

  TestValidator.predicate(
    "combined filter results should match all criteria",
    () =>
      combinedResponse.data.every(
        (post) =>
          post.community_forum_community_id === community.id &&
          post.community_forum_user_id === user.id &&
          post.type === "text",
      ),
  );

  // Test 11: Search with pagination and limit
  const paginatedResponse: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.user.posts.index(connection, {
      body: {
        page: 2,
        limit: 3,
      },
    });
  typia.assert(paginatedResponse);

  TestValidator.predicate(
    "pagination should work correctly",
    () =>
      paginatedResponse.pagination.current === 2 &&
      paginatedResponse.pagination.limit === 3,
  );
}

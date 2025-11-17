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

export async function test_api_user_posts_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a user account to test with
  const userJoinData = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.alphabets(8),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinData,
    });
  typia.assert(user);

  // Step 2: Create a community for the user to post in
  const communityData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph(),
    rules: RandomGenerator.paragraph(),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create multiple posts by the user
  const postsToCreate = 5;
  const postIds: string[] = [];

  for (let i = 0; i < postsToCreate; i++) {
    const postData = {
      community_forum_community_id: community.id,
      title: RandomGenerator.name(4),
      type: "text" as const,
      body: RandomGenerator.content(),
    } satisfies ICommunityForumCommunityPost.ICreate;

    const post: ICommunityForumCommunityPost =
      await api.functional.communityForum.user.posts.create(connection, {
        body: postData,
      });
    typia.assert(post);
    postIds.push(post.id);
  }

  // Step 4: Retrieve posts by the user with pagination and filtering
  // Test default retrieval (should return all posts)
  const allPostsResponse: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.users.posts.index(connection, {
      username: user.username,
      body: {}, // No filters
    });
  typia.assert(allPostsResponse);

  TestValidator.equals(
    "all posts should be returned",
    allPostsResponse.pagination.records,
    postsToCreate,
  );

  TestValidator.equals(
    "data array should match record count",
    allPostsResponse.data.length,
    allPostsResponse.pagination.records,
  );

  // Test pagination with limit
  const limit = 2;
  const paginatedResponse: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.users.posts.index(connection, {
      username: user.username,
      body: {
        limit: limit,
      },
    });
  typia.assert(paginatedResponse);

  TestValidator.equals(
    "paginated response should have correct limit",
    paginatedResponse.pagination.limit,
    limit,
  );

  TestValidator.equals(
    "paginated data should match limit",
    paginatedResponse.data.length,
    limit,
  );

  // Test sorting by new (default)
  const sortedResponse: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.users.posts.index(connection, {
      username: user.username,
      body: {
        sort: "new",
      },
    });
  typia.assert(sortedResponse);

  // Verify posts are sorted by creation date (newest first)
  for (let i = 0; i < sortedResponse.data.length - 1; i++) {
    const currentPostDate = new Date(sortedResponse.data[i].created_at);
    const nextPostDate = new Date(sortedResponse.data[i + 1].created_at);
    TestValidator.predicate(
      "posts should be sorted by creation date (newest first)",
      currentPostDate >= nextPostDate,
    );
  }

  // Test filtering by post type
  const textPostResponse: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.users.posts.index(connection, {
      username: user.username,
      body: {
        type: "text",
      },
    });
  typia.assert(textPostResponse);

  TestValidator.equals(
    "all posts should be text type",
    textPostResponse.data.every((post) => post.type === "text"),
    true,
  );

  // Test with multiple filters (type and limit)
  const filteredResponse: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.users.posts.index(connection, {
      username: user.username,
      body: {
        type: "text",
        limit: 3,
      },
    });
  typia.assert(filteredResponse);

  TestValidator.equals(
    "filtered response should have correct limit",
    filteredResponse.data.length,
    Math.min(3, postsToCreate),
  );

  TestValidator.equals(
    "filtered posts should all be text type",
    filteredResponse.data.every((post) => post.type === "text"),
    true,
  );
}

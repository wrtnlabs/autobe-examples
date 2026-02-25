import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostFavorite";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostFavorite";
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
import { generate_random_community_platform_user_subscriptions_create } from "../../../generate/generate_random_community_platform_user_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_post_favorites_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create primary user
  const primaryConnection: api.IConnection = { host: connection.host };
  const primaryUser = await authorize_user_join(primaryConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(primaryUser);
  // Create secondary user
  const secondaryConnection: api.IConnection = { host: connection.host };
  const secondaryUser = await authorize_user_join(secondaryConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(secondaryUser);
  // Create third user
  const thirdConnection: api.IConnection = { host: connection.host };
  const thirdUser = await authorize_user_join(thirdConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(thirdUser);
  // Primary user creates community
  const community =
    await generate_random_community_platform_user_communities_create(
      primaryConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Primary user subscribes to community
  const subscription =
    await generate_random_community_platform_user_subscriptions_create(
      primaryConnection,
      {
        body: {
          community_platform_community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Create posts with searchable titles
  const searchTerm = "advanced_filter_test";
  const post1 = await generate_random_community_platform_user_posts_create(
    primaryConnection,
    {
      body: {
        title: `Post with ${searchTerm} keyword`,
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_community_platform_user_posts_create(
    secondaryConnection,
    {
      body: {
        title: "Another post for cross-user testing",
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  const post3 = await generate_random_community_platform_user_posts_create(
    primaryConnection,
    {
      body: {
        title: "Third post for additional data",
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post3);
  // Capture timestamp before creating favorites
  const timestampBeforeFavorites = new Date().toISOString();
  // Primary user favorites posts
  const favorite1 =
    await api.functional.communityPlatform.user.posts.favorites.create(
      primaryConnection,
      {
        postId: post1.id,
      },
    );
  typia.assert(favorite1);
  const favorite2 =
    await api.functional.communityPlatform.user.posts.favorites.create(
      primaryConnection,
      {
        postId: post2.id,
      },
    );
  typia.assert(favorite2);
  // Secondary user favorites a post
  const favorite3 =
    await api.functional.communityPlatform.user.posts.favorites.create(
      secondaryConnection,
      {
        postId: post3.id,
      },
    );
  typia.assert(favorite3);
  // Third user favorites a post for user_id filtering
  const favorite4 =
    await api.functional.communityPlatform.user.posts.favorites.create(
      thirdConnection,
      {
        postId: post1.id,
      },
    );
  typia.assert(favorite4);
  // Capture timestamp after creating favorites
  const timestampAfterFavorites = new Date().toISOString();
  // Test 1: Search term filtering
  const searchResults =
    await api.functional.communityPlatform.user.posts.favorites.index(
      primaryConnection,
      {
        body: {
          search: searchTerm,
        } satisfies ICommunityPlatformPostFavorite.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.equals(
    "search results contain search term",
    searchResults.data.length,
    1,
  );
  TestValidator.predicate(
    "search result matches post title",
    searchResults.data[0].post.title.includes(searchTerm),
  );
  // Test 2: Post ID filtering
  const postIdResults =
    await api.functional.communityPlatform.user.posts.favorites.index(
      primaryConnection,
      {
        body: {
          post_id: post1.id,
        } satisfies ICommunityPlatformPostFavorite.IRequest,
      },
    );
  typia.assert(postIdResults);
  TestValidator.equals(
    "post ID filter returns correct post",
    postIdResults.data.length,
    1,
  );
  TestValidator.equals(
    "post ID matches",
    postIdResults.data[0].post.id,
    post1.id,
  );
  // Test 3: User ID filtering
  const userIdResults =
    await api.functional.communityPlatform.user.posts.favorites.index(
      primaryConnection,
      {
        body: {
          user_id: secondaryUser.id,
        } satisfies ICommunityPlatformPostFavorite.IRequest,
      },
    );
  typia.assert(userIdResults);
  TestValidator.equals(
    "user ID filter returns favorites by specified user",
    userIdResults.data.length,
    1,
  );
  TestValidator.equals(
    "user ID matches",
    userIdResults.data[0].post.author.id,
    secondaryUser.id,
  );
  // Test 4: Date range filtering
  const dateRangeResults =
    await api.functional.communityPlatform.user.posts.favorites.index(
      primaryConnection,
      {
        body: {
          created_at_from: timestampBeforeFavorites,
          created_at_to: timestampAfterFavorites,
        } satisfies ICommunityPlatformPostFavorite.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  TestValidator.predicate(
    "date range returns favorites within range",
    dateRangeResults.data.length >= 2,
  );
  // Test 5: Pagination
  const paginationResults =
    await api.functional.communityPlatform.user.posts.favorites.index(
      primaryConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformPostFavorite.IRequest,
      },
    );
  typia.assert(paginationResults);
  TestValidator.equals(
    "pagination respects limit",
    paginationResults.data.length,
    2,
  );
  TestValidator.equals(
    "pagination metadata",
    paginationResults.pagination.limit,
    2,
  );
  // Test 6: Combined filters (AND logic)
  const combinedResults =
    await api.functional.communityPlatform.user.posts.favorites.index(
      primaryConnection,
      {
        body: {
          search: searchTerm,
          post_id: post1.id,
          created_at_from: timestampBeforeFavorites,
          created_at_to: timestampAfterFavorites,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostFavorite.IRequest,
      },
    );
  typia.assert(combinedResults);
  TestValidator.equals(
    "combined filters return exactly one result",
    combinedResults.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter post ID matches",
    combinedResults.data[0].post.id,
    post1.id,
  );
  TestValidator.predicate(
    "combined filter search term matches",
    combinedResults.data[0].post.title.includes(searchTerm),
  );
}

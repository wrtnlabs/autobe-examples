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

export async function test_api_post_favorites_empty_results_constraints(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate primary user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  typia.assert(authorizedUser);
  // Step 2: Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Subscribe user to community
  const subscription =
    await generate_random_community_platform_user_subscriptions_create(
      userConnection,
      {
        body: {
          community_platform_community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Step 4: Create posts
  const posts = ArrayUtil.repeat(3, async () => {
    const post = await generate_random_community_platform_user_posts_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: community.name,
          post_type: "text",
          text_content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });
  // Wait for all posts to be created
  const createdPosts = await Promise.all(posts);
  // Step 5: Favorite at least one post
  const favorite =
    await api.functional.communityPlatform.user.posts.favorites.create(
      userConnection,
      {
        postId: createdPosts[0].id,
      },
    );
  typia.assert(favorite);
  // Save the favorite creation time for date range test
  const favoriteCreatedAt = favorite.created_at;
  // Step 6: Create another user for user_id filter test
  const anotherUserConnection: api.IConnection = { host: connection.host };
  const anotherUser = await authorize_user_join(anotherUserConnection, {});
  typia.assert(anotherUser);
  // Step 7: Test 1 - Search term that doesn't match any favorited post content
  const searchResult1 =
    await api.functional.communityPlatform.user.posts.favorites.index(
      userConnection,
      {
        body: {
          search: "completelyuniquestringthatdoesnotexist",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostFavorite.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.equals(
    "search term produces empty results",
    searchResult1.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0 for no-matches",
    searchResult1.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0 for no-matches",
    searchResult1.pagination.pages,
    0,
  );
  // Step 8: Test 2 - Date range that excludes all favorite creation times
  // Calculate date 1 hour before favorite creation
  const oneHourBefore = new Date(
    new Date(favoriteCreatedAt).getTime() - 3600000,
  );
  const searchResult2 =
    await api.functional.communityPlatform.user.posts.favorites.index(
      userConnection,
      {
        body: {
          created_at_from: oneHourBefore.toISOString(),
          created_at_to: new Date(
            oneHourBefore.getTime() + 1800000,
          ).toISOString(), // 30 minutes later
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostFavorite.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.equals(
    "date range excludes all favorites",
    searchResult2.data.length,
    0,
  );
  TestValidator.equals(
    "date range pagination records should be 0",
    searchResult2.pagination.records,
    0,
  );
  TestValidator.equals(
    "date range pagination pages should be 0",
    searchResult2.pagination.pages,
    0,
  );
  // Step 9: Test 3 - Non-existent post_id
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  const searchResult3 =
    await api.functional.communityPlatform.user.posts.favorites.index(
      userConnection,
      {
        body: {
          post_id: nonExistentPostId,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostFavorite.IRequest,
      },
    );
  typia.assert(searchResult3);
  TestValidator.equals(
    "non-existent post_id produces empty results",
    searchResult3.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent post_id pagination records should be 0",
    searchResult3.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent post_id pagination pages should be 0",
    searchResult3.pagination.pages,
    0,
  );
  // Step 10: Test 4 - user_id of a different user with no favorites
  const searchResult4 =
    await api.functional.communityPlatform.user.posts.favorites.index(
      userConnection,
      {
        body: {
          user_id: anotherUser.id,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostFavorite.IRequest,
      },
    );
  typia.assert(searchResult4);
  TestValidator.equals(
    "different user_id with no favorites produces empty results",
    searchResult4.data.length,
    0,
  );
  TestValidator.equals(
    "different user_id pagination records should be 0",
    searchResult4.pagination.records,
    0,
  );
  TestValidator.equals(
    "different user_id pagination pages should be 0",
    searchResult4.pagination.pages,
    0,
  );
}

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

export async function test_api_post_favorites_paginated_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Register user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // 2. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 5,
          }).replace(/\s+/g, "_"),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe user to community
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
  // 4. Create multiple posts of different types
  const postTypes = ["text", "link", "image"] as const;
  const createdPosts: ICommunityPlatformPost[] = [];
  for (const postType of postTypes) {
    const post = await generate_random_community_platform_user_posts_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          community_name: community.name,
          post_type: postType,
          text_content:
            postType === "text"
              ? RandomGenerator.paragraph({ sentences: 5 })
              : undefined,
          link_url:
            postType === "link"
              ? typia.random<string & tags.Format<"uri">>()
              : undefined,
          image_url:
            postType === "image"
              ? typia.random<string & tags.Format<"uri">>()
              : undefined,
          image_alt:
            postType === "image"
              ? RandomGenerator.paragraph({ sentences: 1 })
              : undefined,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    createdPosts.push(post);
  }
  // 5. Create favorites on all posts
  const favorites: ICommunityPlatformPostFavorite[] = [];
  for (const post of createdPosts) {
    const favorite =
      await api.functional.communityPlatform.user.posts.favorites.create(
        userConnection,
        {
          postId: post.id,
        },
      );
    typia.assert(favorite);
    favorites.push(favorite);
    // Add small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 6. Execute main test: search favorites with empty request body
  const searchResult =
    await api.functional.communityPlatform.user.posts.favorites.index(
      userConnection,
      {
        body: {} satisfies ICommunityPlatformPostFavorite.IRequest,
      },
    );
  typia.assert(searchResult);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "total records match created favorites",
    searchResult.pagination.records,
    favorites.length,
  );
  TestValidator.predicate(
    "current page is 1",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is positive",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pages count is correct",
    searchResult.pagination.pages ===
      Math.ceil(favorites.length / searchResult.pagination.limit),
  );
  // 8. Validate results ordering (should be by favorited_at descending)
  if (searchResult.data.length > 1) {
    for (let i = 1; i < searchResult.data.length; i++) {
      const current = new Date(searchResult.data[i].favorited_at);
      const previous = new Date(searchResult.data[i - 1].favorited_at);
      TestValidator.predicate(
        "results ordered by favorited_at descending",
        current <= previous,
      );
    }
  }
  // 9. Validate each result contains required metadata
  for (const favoriteSummary of searchResult.data) {
    TestValidator.predicate(
      "has favorite_id",
      typeof favoriteSummary.favorite_id === "string",
    );
    TestValidator.predicate(
      "has favorited_at",
      typeof favoriteSummary.favorited_at === "string",
    );
    TestValidator.predicate(
      "has post information",
      favoriteSummary.post !== undefined,
    );
    TestValidator.predicate(
      "post has author",
      favoriteSummary.post.author !== undefined,
    );
    TestValidator.predicate(
      "post has community",
      favoriteSummary.post.community !== undefined,
    );
    TestValidator.predicate(
      "post has title",
      typeof favoriteSummary.post.title === "string",
    );
    TestValidator.predicate(
      "post has post_type",
      typeof favoriteSummary.post.post_type === "string",
    );
    TestValidator.predicate(
      "post has created_at",
      typeof favoriteSummary.post.created_at === "string",
    );
  }
  // 10. Verify all created favorites are returned
  const returnedFavoriteIds = new Set(
    searchResult.data.map((f) => f.favorite_id),
  );
  for (const favorite of favorites) {
    TestValidator.predicate(
      "created favorite is returned",
      returnedFavoriteIds.has(favorite.id),
    );
  }
}

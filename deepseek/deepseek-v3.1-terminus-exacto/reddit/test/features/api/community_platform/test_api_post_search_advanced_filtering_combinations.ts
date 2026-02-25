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

export async function test_api_post_search_advanced_filtering_combinations(
  connection: api.IConnection,
): Promise<void> {
  // Create first user and authenticate
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(10),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user1);
  // Create second user and authenticate
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(10),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user2);
  // Create first community
  const community1 =
    await generate_random_community_platform_user_communities_create(
      user1Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // Create second community
  const community2 =
    await generate_random_community_platform_user_communities_create(
      user1Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // Create posts with different types and attributes
  const post1 = await generate_random_community_platform_user_posts_create(
    user1Connection,
    {
      body: {
        title: "Test post about programming",
        community_name: community1.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_community_platform_user_posts_create(
    user1Connection,
    {
      body: {
        title: "Interesting article link",
        community_name: community1.name,
        post_type: "link" as const,
        link_url: "https://example.com/article",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  const post3 = await generate_random_community_platform_user_posts_create(
    user2Connection,
    {
      body: {
        title: "Beautiful programming image",
        community_name: community1.name,
        post_type: "image" as const,
        image_url: "https://example.com/image.jpg",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post3);
  const post4 = await generate_random_community_platform_user_posts_create(
    user1Connection,
    {
      body: {
        title: "Another programming post",
        community_name: community2.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post4);
  // Test 1: Filter by community ID only
  const search1 = await api.functional.communityPlatform.user.posts.search(
    user1Connection,
    {
      body: {
        community_id: community1.id,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(search1);
  TestValidator.equals("community1 posts count", search1.data.length, 3);
  // Test 2: Filter by community ID and author ID
  const search2 = await api.functional.communityPlatform.user.posts.search(
    user1Connection,
    {
      body: {
        community_id: community1.id,
        user_id: user1.id,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(search2);
  TestValidator.equals("community1 user1 posts count", search2.data.length, 2);
  // Test 3: Filter by community ID, author ID, and post type
  const search3 = await api.functional.communityPlatform.user.posts.search(
    user1Connection,
    {
      body: {
        community_id: community1.id,
        user_id: user1.id,
        post_type: "text" as const,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(search3);
  TestValidator.equals(
    "community1 user1 text posts count",
    search3.data.length,
    1,
  );
  // Test 4: Filter by title search
  const search4 = await api.functional.communityPlatform.user.posts.search(
    user1Connection,
    {
      body: {
        search: "programming",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(search4);
  TestValidator.predicate(
    "search returns programming posts",
    search4.data.length >= 2,
  );
  // Test 5: Combined filtering with title search
  const search5 = await api.functional.communityPlatform.user.posts.search(
    user1Connection,
    {
      body: {
        community_id: community1.id,
        user_id: user1.id,
        post_type: "text" as const,
        search: "programming",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(search5);
  TestValidator.equals("combined filter exact match", search5.data.length, 1);
  // Test 6: Non-existent community filter
  const search6 = await api.functional.communityPlatform.user.posts.search(
    user1Connection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(search6);
  TestValidator.equals(
    "non-existent community returns empty",
    search6.data.length,
    0,
  );
  // Test 7: Non-existent author filter
  const search7 = await api.functional.communityPlatform.user.posts.search(
    user1Connection,
    {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(search7);
  TestValidator.equals(
    "non-existent author returns empty",
    search7.data.length,
    0,
  );
}

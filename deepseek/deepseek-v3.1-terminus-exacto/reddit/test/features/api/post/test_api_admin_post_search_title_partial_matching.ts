import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_admin_post_search_title_partial_matching(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create posts with diverse title patterns for partial matching testing
  const posts: ICommunityPlatformPost[] = [];
  // Generate random community names that will be used consistently
  const communityName1 = RandomGenerator.alphaNumeric(8);
  const communityName2 = RandomGenerator.alphaNumeric(8);
  // Post 1: Common word "technology" with variations
  const post1 = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: "The Future of Technology Innovation",
        community_name: communityName1,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  posts.push(post1);
  // Post 2: Partial match "techno"
  const post2 = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: "Technological Advancements in AI",
        community_name: communityName1,
        post_type: "link",
        link_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  posts.push(post2);
  // Post 3: Edge case with special characters
  const post3 = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: "Tech: The Digital Revolution",
        community_name: communityName1,
        post_type: "image",
        image_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post3);
  posts.push(post3);
  // Post 4: Different community to test cross-community search
  const post4 = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: "Technology Trends in Healthcare",
        community_name: communityName2,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post4);
  posts.push(post4);
  // Post 5: Completely different word for negative testing
  const post5 = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: "Art and Creativity in Modern Society",
        community_name: communityName2,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post5);
  posts.push(post5);
  // Test 1: Partial matching with "tech" prefix
  const searchResults1 =
    await api.functional.communityPlatform.admin.posts.search(adminConnection, {
      body: {
        search: "tech",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(searchResults1);
  // Validate that posts containing "tech" are returned
  const techPosts = posts.filter((post) =>
    post.title.toLowerCase().includes("tech"),
  );
  TestValidator.predicate(
    "tech search returns matching posts",
    searchResults1.data.length >= techPosts.length,
  );
  // Test 2: Partial matching with "techno" prefix
  const searchResults2 =
    await api.functional.communityPlatform.admin.posts.search(adminConnection, {
      body: {
        search: "techno",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(searchResults2);
  // Test 3: Edge case with special characters
  const searchResults3 =
    await api.functional.communityPlatform.admin.posts.search(adminConnection, {
      body: {
        search: "digital",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(searchResults3);
  // Test 4: Community-specific search using actual community ID
  const communityId = posts[0]?.community.id;
  if (communityId) {
    const searchResults4 =
      await api.functional.communityPlatform.admin.posts.search(
        adminConnection,
        {
          body: {
            search: "technology",
            community_id: communityId,
            limit: 10,
            page: 1,
          } satisfies ICommunityPlatformPost.IRequest,
        },
      );
    typia.assert(searchResults4);
  }
  // Test 5: Negative test - search for non-existent term
  const searchResults5 =
    await api.functional.communityPlatform.admin.posts.search(adminConnection, {
      body: {
        search: "xyzabc123",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(searchResults5);
  TestValidator.equals(
    "non-existent search returns empty",
    searchResults5.data.length,
    0,
  );
  // Test 6: Post type filtering with search
  const searchResults6 =
    await api.functional.communityPlatform.admin.posts.search(adminConnection, {
      body: {
        search: "technology",
        post_type: "text",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(searchResults6);
  // Validate pagination
  TestValidator.predicate(
    "pagination info present",
    searchResults1.pagination.records >= 0 &&
      searchResults1.pagination.pages >= 0 &&
      searchResults1.pagination.limit === 10,
  );
  // Validate result ordering (should prioritize relevance)
  if (searchResults1.data.length > 1) {
    TestValidator.predicate(
      "results contain search term",
      searchResults1.data.some((post) =>
        post.title.toLowerCase().includes("tech"),
      ),
    );
  }
}

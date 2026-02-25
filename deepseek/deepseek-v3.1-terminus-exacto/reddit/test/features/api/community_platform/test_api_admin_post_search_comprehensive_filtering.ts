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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_admin_post_search_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Create multiple test users
  const users = await Promise.all(
    ArrayUtil.repeat(3, async (index) => {
      const userConnection: api.IConnection = { host: connection.host };
      const user = await authorize_user_join(userConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "password123",
          username: RandomGenerator.alphaNumeric(12),
        } satisfies ICommunityPlatformUser.IJoin,
      });
      return user;
    }),
  );
  // Create multiple test communities using the first user
  const communities = await Promise.all(
    ArrayUtil.repeat(2, async (index) => {
      const userConnection: api.IConnection = { host: connection.host };
      await authorize_user_login(userConnection, {
        body: {
          email: users[0].email,
          password: "password123",
        } satisfies ICommunityPlatformUser.ILogin,
      });
      const community =
        await generate_random_community_platform_user_communities_create(
          userConnection,
          {
            body: {
              name: RandomGenerator.alphabets(10),
              description: RandomGenerator.paragraph({ sentences: 2 }),
            } satisfies ICommunityPlatformCommunity.ICreate,
          },
        );
      return community;
    }),
  );
  // Create test posts of different types across communities by different users
  const posts = [];
  const postTypes = ["text", "link", "image"] as const;
  for (let i = 0; i < 9; i++) {
    const userIndex = i % users.length;
    const communityIndex = i % communities.length;
    const postType = postTypes[i % postTypes.length];
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_login(userConnection, {
      body: {
        email: users[userIndex].email,
        password: "password123",
      } satisfies ICommunityPlatformUser.ILogin,
    });
    const postBody: ICommunityPlatformPost.ICreate = {
      title: `Test Post ${i} ${RandomGenerator.alphabets(5)}`,
      community_name: communities[communityIndex].name,
      post_type: postType,
    };
    if (postType === "text") {
      postBody.text_content = RandomGenerator.paragraph({ sentences: 3 });
    } else if (postType === "link") {
      postBody.link_url = typia.random<string & tags.Format<"uri">>();
    } else if (postType === "image") {
      postBody.image_url = typia.random<string & tags.Format<"uri">>();
      postBody.image_alt = RandomGenerator.paragraph({ sentences: 1 });
    }
    const post = await generate_random_community_platform_user_posts_create(
      userConnection,
      {
        body: postBody,
      },
    );
    posts.push(post);
  }
  // Test 1: Search by title keyword with partial matching
  const searchResult1 =
    await api.functional.communityPlatform.admin.posts.search(adminConnection, {
      body: {
        search: "Test Post",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(searchResult1);
  TestValidator.predicate(
    "should find posts with 'Test Post' in title",
    searchResult1.data.length > 0,
  );
  TestValidator.predicate(
    "pagination metadata should be valid",
    searchResult1.pagination.records >= searchResult1.data.length,
  );
  // Test 2: Filter by specific post type
  const searchResult2 =
    await api.functional.communityPlatform.admin.posts.search(adminConnection, {
      body: {
        post_type: "text",
        limit: 5,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(searchResult2);
  TestValidator.predicate(
    "should only return text posts",
    searchResult2.data.every((post) => post.post_type === "text"),
  );
  // Test 3: Filter by community ID
  const searchResult3 =
    await api.functional.communityPlatform.admin.posts.search(adminConnection, {
      body: {
        community_id: communities[0].id,
        limit: 5,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(searchResult3);
  TestValidator.predicate(
    "should only return posts from specific community",
    searchResult3.data.every((post) => post.community.id === communities[0].id),
  );
  // Test 4: Filter by author user ID
  const searchResult4 =
    await api.functional.communityPlatform.admin.posts.search(adminConnection, {
      body: {
        user_id: users[0].id,
        limit: 5,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(searchResult4);
  TestValidator.predicate(
    "should only return posts by specific author",
    searchResult4.data.every((post) => post.author.id === users[0].id),
  );
  // Test 5: Combine multiple filters
  const searchResult5 =
    await api.functional.communityPlatform.admin.posts.search(adminConnection, {
      body: {
        community_id: communities[0].id,
        post_type: "text",
        search: "Test Post",
        limit: 5,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(searchResult5);
  TestValidator.predicate(
    "combined filter should return matching posts",
    searchResult5.data.every(
      (post) =>
        post.community.id === communities[0].id &&
        post.post_type === "text" &&
        post.title.includes("Test Post"),
    ),
  );
  // Test 6: Pagination validation
  const searchResult6 =
    await api.functional.communityPlatform.admin.posts.search(adminConnection, {
      body: {
        limit: 3,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(searchResult6);
  TestValidator.predicate(
    "page 1 should return limited results",
    searchResult6.data.length <= 3,
  );
  TestValidator.predicate(
    "pagination metadata should be accurate",
    searchResult6.pagination.current === 1 &&
      searchResult6.pagination.limit === 3,
  );
  // Test 7: Empty search result
  const searchResult7 =
    await api.functional.communityPlatform.admin.posts.search(adminConnection, {
      body: {
        search: "NonexistentKeyword12345",
        limit: 5,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(searchResult7);
  TestValidator.equals(
    "search for nonexistent keyword should return empty",
    searchResult7.data.length,
    0,
  );
  // Verify all search results contain complete post summary information
  const allSearchResults = [
    searchResult1,
    searchResult2,
    searchResult3,
    searchResult4,
    searchResult5,
    searchResult6,
  ];
  allSearchResults.forEach((result, index) => {
    TestValidator.predicate(
      `search result ${index + 1} should have valid post summaries`,
      result.data.every(
        (post) =>
          post.id &&
          post.title &&
          post.post_type &&
          post.author.id &&
          post.author.username &&
          post.community.id &&
          post.community.name &&
          post.created_at,
      ),
    );
  });
}

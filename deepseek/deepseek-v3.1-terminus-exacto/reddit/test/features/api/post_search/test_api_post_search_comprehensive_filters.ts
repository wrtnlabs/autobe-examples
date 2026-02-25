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

export async function test_api_post_search_comprehensive_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create test users
  const userConnections: api.IConnection[] = ArrayUtil.repeat(3, () => ({
    host: connection.host,
  }));
  const users: ICommunityPlatformUser.IAuthorized[] = [];
  for (let i = 0; i < userConnections.length; i++) {
    const user = await authorize_user_join(userConnections[i], {
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
    users.push(user);
  }
  // Create test communities
  const communities: ICommunityPlatformCommunity[] = [];
  for (let i = 0; i < 2; i++) {
    const community =
      await generate_random_community_platform_user_communities_create(
        userConnections[0],
        {
          body: {
            name: RandomGenerator.alphaNumeric(8),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            icon_url: typia.random<string & tags.Format<"uri">>(),
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(community);
    communities.push(community);
  }
  // Create test posts of different types with diverse titles
  const postTypes = ["text", "link", "image"] as const;
  const posts: ICommunityPlatformPost[] = [];
  const titles = [
    "Introduction to TypeScript Programming",
    "Advanced JavaScript Techniques",
    "Web Development Best Practices",
    "Database Design Patterns",
    "API Security Fundamentals",
    "Cloud Computing Overview",
  ];
  for (let i = 0; i < 6; i++) {
    const userIndex = i % users.length;
    const communityIndex = i % communities.length;
    const postType = postTypes[i % postTypes.length];
    const post = await generate_random_community_platform_user_posts_create(
      userConnections[userIndex],
      {
        body: {
          title: titles[i],
          community_name: communities[communityIndex].name,
          post_type: postType,
          text_content:
            postType === "text"
              ? RandomGenerator.content({
                  paragraphs: 1,
                  sentenceMin: 5,
                  sentenceMax: 10,
                })
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
    posts.push(post);
  }
  // Test 1: Community-specific filtering
  const communityFilterResult =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        community_id: communities[0].id,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(communityFilterResult);
  TestValidator.predicate(
    "community filter returns posts",
    communityFilterResult.data.length > 0,
  );
  for (const post of communityFilterResult.data) {
    TestValidator.equals(
      "post belongs to specified community",
      post.community.id,
      communities[0].id,
    );
  }
  // Test 2: Author filtering
  const authorFilterResult = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        user_id: users[0].id,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(authorFilterResult);
  if (authorFilterResult.data.length > 0) {
    for (const post of authorFilterResult.data) {
      TestValidator.equals(
        "post belongs to specified author",
        post.author.id,
        users[0].id,
      );
    }
  }
  // Test 3: Post type filtering
  const postTypeFilterResult =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        post_type: "text",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(postTypeFilterResult);
  if (postTypeFilterResult.data.length > 0) {
    for (const post of postTypeFilterResult.data) {
      TestValidator.equals("post is of specified type", post.post_type, "text");
    }
  }
  // Test 4: Title search with partial matching
  const searchTerm = "TypeScript";
  const titleSearchResult = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        search: searchTerm,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(titleSearchResult);
  TestValidator.predicate(
    "title search returns results",
    titleSearchResult.data.length > 0,
  );
  // Test 5: Combined filters
  const combinedFilterResult =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        community_id: communities[0].id,
        post_type: "text",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(combinedFilterResult);
  if (combinedFilterResult.data.length > 0) {
    for (const post of combinedFilterResult.data) {
      TestValidator.equals(
        "post matches combined filters - community",
        post.community.id,
        communities[0].id,
      );
      TestValidator.equals(
        "post matches combined filters - type",
        post.post_type,
        "text",
      );
    }
  }
  // Test 6: Pagination
  const paginationResult = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination returns correct page size",
    paginationResult.data.length <= 2,
    true,
  );
  TestValidator.predicate(
    "pagination metadata is correct",
    paginationResult.pagination.current === 1 &&
      paginationResult.pagination.limit === 2 &&
      paginationResult.pagination.records >= 0 &&
      paginationResult.pagination.pages >= 0,
  );
  // Test 7: Empty search results
  const emptySearchResult = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        search: "nonexistentsearchterm12345",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns no results",
    emptySearchResult.data.length,
    0,
  );
  // Test 8: Validate post summary structure
  const allPostsResult = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {} satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(allPostsResult);
  for (const post of allPostsResult.data) {
    TestValidator.predicate("post has valid ID", post.id.length > 0);
    TestValidator.predicate("post has title", post.title.length > 0);
    TestValidator.predicate(
      "post has valid post type",
      ["text", "link", "image"].includes(post.post_type),
    );
    TestValidator.predicate(
      "post has author information",
      post.author.id.length > 0 && post.author.username.length > 0,
    );
    TestValidator.predicate(
      "post has community information",
      post.community.id.length > 0 && post.community.name.length > 0,
    );
    TestValidator.predicate(
      "post has creation timestamp",
      post.created_at.length > 0,
    );
  }
}

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
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test pagination functionality and empty result scenarios for post search endpoint.
 *
 * This test verifies:
 * 1. Pagination metadata calculation (current page, limit, total records, total pages)
 * 2. Correct result slicing with different page/limit combinations
 * 3. Empty result handling when search criteria yield no matches
 * 4. Boundary condition handling (page beyond available results)
 */
export async function test_api_post_search_pagination_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create test posts for pagination testing
  const postCount = 7;
  const posts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < postCount; i++) {
    const post = await generate_random_community_platform_user_posts_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          community_name: RandomGenerator.alphabets(8),
          post_type: "text",
          text_content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // Test 1: Basic pagination with default parameters
  const defaultSearch =
    await api.functional.communityPlatform.user.posts.search(userConnection, {
      body: {} satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(defaultSearch);
  TestValidator.equals(
    "default search should return all posts",
    defaultSearch.pagination.records,
    postCount,
  );
  TestValidator.equals(
    "default page should be 1",
    defaultSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default limit should be reasonable",
    defaultSearch.pagination.limit > 0,
  );
  TestValidator.equals(
    "data count should match pagination limit",
    defaultSearch.data.length,
    defaultSearch.pagination.limit,
  );
  // Test 2: Specific pagination parameters
  const pageSize = 3;
  const page2Search = await api.functional.communityPlatform.user.posts.search(
    userConnection,
    {
      body: {
        page: 2,
        limit: pageSize,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(page2Search);
  TestValidator.equals(
    "page 2 should have correct current page",
    page2Search.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 should have correct limit",
    page2Search.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "page 2 should have correct total records",
    page2Search.pagination.records,
    postCount,
  );
  TestValidator.equals(
    "page 2 should have correct total pages",
    page2Search.pagination.pages,
    Math.ceil(postCount / pageSize),
  );
  // Test 3: Empty results with non-matching search criteria
  const emptySearch = await api.functional.communityPlatform.user.posts.search(
    userConnection,
    {
      body: {
        search: "nonexistentkeywordthatshouldnotmatchanything",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search should return 0 records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search should have empty data array",
    emptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "empty search should have 0 pages",
    emptySearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search should have page 1",
    emptySearch.pagination.current,
    1,
  );
  // Test 4: Boundary condition - page beyond total pages
  const beyondPage = Math.ceil(postCount / pageSize) + 1;
  const beyondPageSearch =
    await api.functional.communityPlatform.user.posts.search(userConnection, {
      body: {
        page: beyondPage,
        limit: pageSize,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(beyondPageSearch);
  TestValidator.equals(
    "beyond page should return empty data",
    beyondPageSearch.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page should have correct current page",
    beyondPageSearch.pagination.current,
    beyondPage,
  );
  TestValidator.equals(
    "beyond page should maintain total records",
    beyondPageSearch.pagination.records,
    postCount,
  );
  // Test 5: Limit enforcement (max 100 per schema)
  const maxLimitSearch =
    await api.functional.communityPlatform.user.posts.search(userConnection, {
      body: {
        limit: 100,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(maxLimitSearch);
  TestValidator.predicate(
    "max limit should be respected",
    maxLimitSearch.pagination.limit <= 100,
  );
  TestValidator.equals(
    "max limit search should return correct total",
    maxLimitSearch.pagination.records,
    postCount,
  );
  // Test 6: Pagination calculation validation
  TestValidator.predicate(
    "total pages calculation should be correct",
    beyondPageSearch.pagination.pages ===
      Math.ceil(
        beyondPageSearch.pagination.records / beyondPageSearch.pagination.limit,
      ),
  );
  TestValidator.predicate(
    "records should be non-negative",
    beyondPageSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "current page should be non-negative",
    beyondPageSearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be positive",
    beyondPageSearch.pagination.limit > 0,
  );
}

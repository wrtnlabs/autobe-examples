import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_popular_feed_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test pagination behavior for the Popular Feed endpoint.
   *
   * Setup:
   * 1. Create a member account
   * 2. Create a community (creator becomes subscriber automatically)
   * 3. Create 35 posts to span multiple pages
   *
   * Validation:
   * - Page 1 with limit 10 returns correct items and metadata
   * - Page 2 with limit 10 returns different items (no duplicates)
   * - Page exceeding total pages returns empty data
   * - Maximum limit (100) works correctly
   */
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community (creator automatically becomes owner and subscribed)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create 35 posts to span multiple pages (default limit is 25)
  const POST_COUNT = 35;
  const posts = await ArrayUtil.asyncRepeat(POST_COUNT, async (index) => {
    return await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          title: `Test Post ${index + 1} - ${RandomGenerator.alphabets(8)}`,
          postType: "text",
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  });
  // Validate all posts were created
  TestValidator.equals("total posts created", posts.length, POST_COUNT);
  // 4. Test page 1 with limit 10
  const page1Result = await api.functional.communityPlatform.posts.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 10);
  TestValidator.equals("page 1 data count", page1Result.data.length, 10);
  TestValidator.equals(
    "page 1 total records",
    page1Result.pagination.records,
    POST_COUNT,
  );
  TestValidator.equals(
    "page 1 total pages",
    page1Result.pagination.pages,
    Math.ceil(POST_COUNT / 10),
  );
  // 5. Test page 2 with limit 10
  const page2Result = await api.functional.communityPlatform.posts.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
  TestValidator.equals("page 2 data count", page2Result.data.length, 10);
  TestValidator.equals(
    "page 2 total records",
    page2Result.pagination.records,
    POST_COUNT,
  );
  // 6. Verify no duplicates between page 1 and page 2
  const page1Ids = new Set(page1Result.data.map((p) => p.id));
  const page2Ids = new Set(page2Result.data.map((p) => p.id));
  const hasDuplicates = [...page2Ids].some((id) => page1Ids.has(id));
  TestValidator.predicate("no duplicate posts across pages", !hasDuplicates);
  // 7. Test page exceeding total pages (should return empty data)
  const excessPageResult = await api.functional.communityPlatform.posts.index(
    memberConnection,
    {
      body: {
        page: 100,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(excessPageResult);
  TestValidator.equals(
    "excess page current",
    excessPageResult.pagination.current,
    100,
  );
  TestValidator.equals(
    "excess page data empty",
    excessPageResult.data.length,
    0,
  );
  TestValidator.equals(
    "excess page total records",
    excessPageResult.pagination.records,
    POST_COUNT,
  );
  // 8. Test maximum limit (100)
  const maxLimitResult = await api.functional.communityPlatform.posts.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(maxLimitResult);
  TestValidator.equals("max limit value", maxLimitResult.pagination.limit, 100);
  TestValidator.equals(
    "max limit returns all posts",
    maxLimitResult.data.length,
    POST_COUNT,
  );
  // 9. Test last page with partial results
  const lastPageResult = await api.functional.communityPlatform.posts.index(
    memberConnection,
    {
      body: {
        page: 4,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(lastPageResult);
  TestValidator.equals(
    "last page current",
    lastPageResult.pagination.current,
    4,
  );
  TestValidator.equals(
    "last page partial count",
    lastPageResult.data.length,
    5,
  );
  TestValidator.equals(
    "last page total records",
    lastPageResult.pagination.records,
    POST_COUNT,
  );
  // 10. Verify all pages combined have all posts
  const allPageIds = new Set([
    ...page1Result.data.map((p) => p.id),
    ...page2Result.data.map((p) => p.id),
    ...lastPageResult.data.map((p) => p.id),
  ]);
  TestValidator.equals("all posts across pages", allPageIds.size, POST_COUNT);
}

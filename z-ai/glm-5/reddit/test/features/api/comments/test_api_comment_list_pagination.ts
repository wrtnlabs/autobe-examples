import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
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

export async function test_api_comment_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Setup: Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Setup: Create a post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          postType: "text",
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // Test 1: First page with limit=10
  const page1Response =
    await api.functional.communityPlatform.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          sort: "new",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(page1Response);
  // Validate pagination metadata for page 1
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 10);
  // Validate page 1 data count (should be 10 or less)
  TestValidator.predicate(
    "page 1 has correct number of comments",
    page1Response.data.length <= 10,
  );
  // Collect comment IDs from page 1
  const page1CommentIds = page1Response.data.map((c) => c.id);
  // Test 2: Second page with limit=10
  const page2Response =
    await api.functional.communityPlatform.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 2,
          limit: 10,
          sort: "new",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate pagination metadata for page 2
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 10);
  // Validate no duplicate comments between pages
  const page2CommentIds = page2Response.data.map((c) => c.id);
  const duplicateIds = page1CommentIds.filter((id) =>
    page2CommentIds.includes(id),
  );
  TestValidator.equals(
    "no duplicate comments between pages",
    duplicateIds.length,
    0,
  );
  // Test 3: Validate total records calculation
  const expectedTotalPages = Math.ceil(page1Response.pagination.records / 10);
  TestValidator.equals(
    "total pages calculation",
    page1Response.pagination.pages,
    expectedTotalPages,
  );
  // Test 4: Different limit value (limit=5)
  const limit5Response =
    await api.functional.communityPlatform.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 5,
          sort: "new",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(limit5Response);
  TestValidator.equals(
    "limit 5 - limit value",
    limit5Response.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "limit 5 - data count correct",
    limit5Response.data.length <= 5,
  );
  // Test 5: Different limit value (limit=20)
  const limit20Response =
    await api.functional.communityPlatform.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 20,
          sort: "new",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(limit20Response);
  TestValidator.equals(
    "limit 20 - limit value",
    limit20Response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "limit 20 - data count correct",
    limit20Response.data.length <= 20,
  );
  // Test 6: Maximum limit constraint (limit=100)
  const limit100Response =
    await api.functional.communityPlatform.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 100,
          sort: "new",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(limit100Response);
  TestValidator.equals(
    "limit 100 - limit value",
    limit100Response.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "limit 100 - max constraint enforced",
    limit100Response.data.length <= 100,
  );
  // Test 7: Total records consistency across different queries
  TestValidator.equals(
    "total records consistent across different limits",
    page1Response.pagination.records,
    limit5Response.pagination.records,
  );
  TestValidator.equals(
    "total records consistent with limit 20",
    page1Response.pagination.records,
    limit20Response.pagination.records,
  );
}

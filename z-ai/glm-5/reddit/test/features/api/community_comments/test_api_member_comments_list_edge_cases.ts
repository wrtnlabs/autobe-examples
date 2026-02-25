import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test edge cases for member comment history retrieval.
 *
 * This test covers:
 * 1. Member with no comments returns empty data with correct pagination
 * 2. Pagination beyond available data returns empty data with correct totals
 * 3. Non-existent member returns appropriate error
 * 4. Custom pagination limit works correctly
 */
export async function test_api_member_comments_list_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create a member with no comments (for empty list test)
  const emptyMemberConnection: api.IConnection = { host: connection.host };
  const emptyMember = await authorize_member_join(emptyMemberConnection, {});
  // Create a commenter member who will have comments
  const commenterConnection: api.IConnection = { host: connection.host };
  const commenter = await authorize_member_join(commenterConnection, {});
  // Create community and subscribe the commenter
  const community = await generate_random_community_member_communities_create(
    commenterConnection,
    {},
  );
  await api.functional.community.member.communities.subscribe(
    commenterConnection,
    {
      communityName: community.name,
    },
  );
  // Create a post in the community
  const post = await generate_random_community_member_communities_posts_create(
    commenterConnection,
    { params: { communityName: community.name } },
  );
  // Create 3 comments by the commenter
  await ArrayUtil.asyncRepeat(3, async () => {
    await generate_random_community_member_posts_comments_create(
      commenterConnection,
      {
        params: { postId: post.id },
      },
    );
  });
  // Test 1: Member with no comments returns empty data
  const emptyResult = await api.functional.community.members.comments.index(
    connection,
    {
      memberId: emptyMember.id,
      body: { page: 1, limit: 25 } satisfies ICommunityComment.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals("empty data array", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty pagination current",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty pagination limit",
    emptyResult.pagination.limit,
    25,
  );
  TestValidator.equals(
    "empty pagination records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty pagination pages",
    emptyResult.pagination.pages,
    0,
  );
  // Test 2: Pagination beyond available data returns empty with correct totals
  const beyondResult = await api.functional.community.members.comments.index(
    connection,
    {
      memberId: commenter.id,
      body: { page: 10, limit: 25 } satisfies ICommunityComment.IRequest,
    },
  );
  typia.assert(beyondResult);
  TestValidator.equals("beyond page empty data", beyondResult.data.length, 0);
  TestValidator.equals(
    "beyond page records total",
    beyondResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "beyond page pages total",
    beyondResult.pagination.pages,
    1,
  );
  // Verify first page has the comments
  const firstPageResult = await api.functional.community.members.comments.index(
    connection,
    {
      memberId: commenter.id,
      body: { page: 1, limit: 25 } satisfies ICommunityComment.IRequest,
    },
  );
  typia.assert(firstPageResult);
  TestValidator.equals(
    "first page has comments",
    firstPageResult.data.length,
    3,
  );
  // Test 3: Non-existent member returns error
  const nonExistentUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError("non-existent member", 404, async () => {
    await api.functional.community.members.comments.index(connection, {
      memberId: nonExistentUuid,
      body: { page: 1, limit: 25 } satisfies ICommunityComment.IRequest,
    });
  });
  // Test 4: Pagination with custom limit works correctly
  const customLimitResult =
    await api.functional.community.members.comments.index(connection, {
      memberId: commenter.id,
      body: { page: 1, limit: 2 } satisfies ICommunityComment.IRequest,
    });
  typia.assert(customLimitResult);
  TestValidator.predicate(
    "custom limit result count",
    customLimitResult.data.length <= 2,
  );
  TestValidator.equals(
    "custom limit applied",
    customLimitResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "custom limit records total",
    customLimitResult.pagination.records,
    3,
  );
}

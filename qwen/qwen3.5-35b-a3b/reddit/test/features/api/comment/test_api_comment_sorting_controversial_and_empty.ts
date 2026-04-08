import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

/**
 * Test comment sorting functionality with 'controversial' sort option and empty results handling.
 *
 * Validates the controversial comment sorting algorithm that highlights divisive discussions by ordering comments with similar upvote/downvote counts. Since the test infrastructure does not include a comment creation endpoint, this test focuses on the empty results scenario where posts have no comments.
 *
 * Special attention is given to verifying that when a post has no comments, the sort endpoint returns an empty data array with proper pagination metadata (records=0, pages=0). This ensures the API handles edge cases gracefully and provides consistent pagination responses.
 *
 * 1. Member account creation and authentication.
 * 2. Community creation and subscription.
 * 3. Text post creation for receiving comments.
 * 4. Test controversial sorting on post with no comments:
 *    - Call sort endpoint with sort='controversial'
 *    - Verify empty data array is returned
 *    - Verify pagination metadata shows records=0, pages=0
 * 5. Create second post and verify consistent empty results behavior
 */
export async function test_api_comment_sorting_controversial_and_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member account setup
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Community setup
  const communityName = RandomGenerator.alphaNumeric(8).toLowerCase();
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Subscribe to own community
  await api.functional.redditPlatform.member.communities.subscribe(
    memberConnection,
    {
      communityName: community.name,
    },
  );
  // 3. Create first text post
  const post1 = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  // 4. Test controversial sorting on first post (no comments)
  const sortResult1 =
    await api.functional.redditPlatform.member.posts.comments.sort(
      memberConnection,
      {
        postId: post1.id,
        body: {
          sort: "controversial",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformComment.ISortRequest,
      },
    );
  typia.assert(sortResult1);
  // Validate empty results for first post
  TestValidator.equals(
    "first post returns empty data",
    sortResult1.data.length,
    0,
  );
  TestValidator.equals(
    "first post pagination records",
    sortResult1.pagination.records,
    0,
  );
  TestValidator.equals(
    "first post pagination pages",
    sortResult1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "first post pagination current",
    sortResult1.pagination.current,
    1,
  );
  TestValidator.equals(
    "first post pagination limit",
    sortResult1.pagination.limit,
    20,
  );
  // 5. Create second post to test consistency
  const post2 = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  // 6. Test controversial sorting on second post (no comments)
  const sortResult2 =
    await api.functional.redditPlatform.member.posts.comments.sort(
      memberConnection,
      {
        postId: post2.id,
        body: {
          sort: "controversial",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformComment.ISortRequest,
      },
    );
  typia.assert(sortResult2);
  // Validate empty results for second post
  TestValidator.equals(
    "second post returns empty data",
    sortResult2.data.length,
    0,
  );
  TestValidator.equals(
    "second post pagination records",
    sortResult2.pagination.records,
    0,
  );
  TestValidator.equals(
    "second post pagination pages",
    sortResult2.pagination.pages,
    0,
  );
  // 7. Test with different sort options on empty post
  const newSortResult =
    await api.functional.redditPlatform.member.posts.comments.sort(
      memberConnection,
      {
        postId: post1.id,
        body: {
          sort: "new",
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformComment.ISortRequest,
      },
    );
  typia.assert(newSortResult);
  TestValidator.equals(
    "new sort returns empty data",
    newSortResult.data.length,
    0,
  );
  TestValidator.equals(
    "new sort pagination records",
    newSortResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "new sort pagination limit",
    newSortResult.pagination.limit,
    10,
  );
  // 8. Test with best sort option
  const bestSortResult =
    await api.functional.redditPlatform.member.posts.comments.sort(
      memberConnection,
      {
        postId: post1.id,
        body: {
          sort: "best",
          page: 2,
          limit: 5,
        } satisfies IRedditPlatformComment.ISortRequest,
      },
    );
  typia.assert(bestSortResult);
  TestValidator.equals(
    "best sort returns empty data",
    bestSortResult.data.length,
    0,
  );
  TestValidator.equals(
    "best sort pagination records",
    bestSortResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "best sort pagination current",
    bestSortResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "best sort pagination limit",
    bestSortResult.pagination.limit,
    5,
  );
}
import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test retrieving comments with nested reply filtering.
 *
 * This test validates the comment retrieval endpoint's ability to:
 * 1. Return empty results when no comments exist on a post
 * 2. Apply pagination correctly to comment lists
 * 3. Filter by parent_comment_id (returns empty for non-existent parent)
 * 4. Support different sorting strategies (best, new, controversial)
 * 5. Include proper pagination metadata
 *
 * Note: Comment creation API is not available in the provided SDK, so this test
 * focuses on retrieval functionality with posts that have no comments.
 */
export async function test_api_comment_retrieval_with_nested_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<
          string &
            tags.MinLength<1> &
            tags.MaxLength<255> &
            tags.Format<"email">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community (owner auto-subscribed, but let's verify)
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Test 1: Retrieve comments from post with no comments (should return empty)
  const emptyComments =
    await api.functional.redditPlatform.posts.comments.index(memberConnection, {
      postId: post.id,
      body: {
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformComment.IRequest,
    });
  typia.assert(emptyComments);
  // Validate empty result
  TestValidator.equals("no comments on new post", emptyComments.data.length, 0);
  TestValidator.equals(
    "pagination current page",
    emptyComments.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records",
    emptyComments.pagination.records,
    0,
  );
  TestValidator.predicate(
    "pagination has limit",
    emptyComments.pagination.limit > 0,
  );
  // 6. Test 2: Filter by non-existent parent_comment_id (should return empty)
  const fakeCommentId = typia.random<string & tags.Format<"uuid">>();
  const repliesToFake =
    await api.functional.redditPlatform.posts.comments.index(memberConnection, {
      postId: post.id,
      body: {
        parent_comment_id: fakeCommentId,
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformComment.IRequest,
    });
  typia.assert(repliesToFake);
  TestValidator.equals(
    "no replies to fake comment",
    repliesToFake.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records for filtered query",
    repliesToFake.pagination.records,
    0,
  );
  // 7. Test 3: Test different sorting strategies
  const sortedByBest = await api.functional.redditPlatform.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sort: "best",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(sortedByBest);
  TestValidator.equals(
    "best sort returns empty for no comments",
    sortedByBest.data.length,
    0,
  );
  const sortedByControversial =
    await api.functional.redditPlatform.posts.comments.index(memberConnection, {
      postId: post.id,
      body: {
        sort: "controversial",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformComment.IRequest,
    });
  typia.assert(sortedByControversial);
  TestValidator.equals(
    "controversial sort returns empty for no comments",
    sortedByControversial.data.length,
    0,
  );
  // 8. Test 4: Test pagination with different limit values
  const limitedComments =
    await api.functional.redditPlatform.posts.comments.index(memberConnection, {
      postId: post.id,
      body: {
        sort: "new",
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformComment.IRequest,
    });
  typia.assert(limitedComments);
  TestValidator.equals(
    "limit parameter respected",
    limitedComments.pagination.limit,
    20,
  );
  // 9. Test 5: Test pagination page parameter
  const page2Comments =
    await api.functional.redditPlatform.posts.comments.index(memberConnection, {
      postId: post.id,
      body: {
        sort: "new",
        page: 2,
        limit: 10,
      } satisfies IRedditPlatformComment.IRequest,
    });
  typia.assert(page2Comments);
  TestValidator.equals(
    "page 2 returns empty when no data",
    page2Comments.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current page is 2",
    page2Comments.pagination.current,
    2,
  );
}

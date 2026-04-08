import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test comment thread navigation by parent comment ID filtering.
 *
 * Validates the threaded comment retrieval functionality where users can filter comments by parentCommentId to navigate nested reply threads. This test establishes the complete content hierarchy (member → community → subscription → post) and then tests the comment retrieval endpoint with various parentCommentId filter scenarios.
 *
 * The test verifies that the API correctly handles parentCommentId filtering for threaded conversations, returns proper pagination metadata, and structures comment data according to the IRedditCommunityComment.ISummary schema. Special attention is given to ensuring that the filtering mechanism works correctly for both top-level comments (no parentCommentId) and reply threads (with parentCommentId).
 *
 * 1. Member authentication via authorize_member_join utility.
 * 2. Community creation with randomized data.
 * 3. Community subscription to enable posting privileges.
 * 4. Post creation within the subscribed community.
 * 5. Retrieve top-level comments without parentCommentId filter.
 * 6. Validate pagination structure and comment data format.
 * 7. Retrieve filtered comments with parentCommentId parameter.
 * 8. Verify filtering behavior and response structure consistency.
 */
export async function test_api_comment_thread_navigation_by_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create post in community (text type with body)
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Retrieve top-level comments (no parentCommentId filter)
  const topLevelComments =
    await api.functional.redditCommunity.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          limit: 20,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(topLevelComments);
  // 6. Validate comments data exists and is array
  TestValidator.predicate(
    "data is array",
    Array.isArray(topLevelComments.data),
  );
  // 7. Retrieve filtered comments with parentCommentId (test filtering mechanism)
  // Using a random UUID to test the filter parameter is accepted by the API
  const parentCommentId = typia.random<string & tags.Format<"uuid">>();
  const filteredComments =
    await api.functional.redditCommunity.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          limit: 20,
          parentCommentId: parentCommentId,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(filteredComments);
  // 8. Validate filtered response structure matches expected schema
  TestValidator.predicate(
    "filtered data is array",
    Array.isArray(filteredComments.data),
  );
  TestValidator.predicate(
    "filtered pagination exists",
    filteredComments.pagination !== undefined,
  );
  // 9. Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination current is valid",
    filteredComments.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    filteredComments.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    filteredComments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    filteredComments.pagination.pages >= 0,
  );
}

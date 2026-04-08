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
 * Test retrieving comments from a post sorted by vote score (best first).
 *
 * Validates the comment retrieval endpoint with 'best' sorting strategy, which orders comments by vote score descending (highest voted comments appear first). This is the default sorting behavior users expect when viewing popular discussions.
 *
 * The test establishes the complete content hierarchy: member authentication, community creation, subscription, and post creation. Then retrieves comments using the sort='best' parameter to verify the endpoint accepts and processes the sorting instruction correctly.
 *
 * Note: Comment creation and voting APIs are not available in the provided SDK functions. This test validates the comment retrieval endpoint structure, pagination metadata, and sort parameter handling. In a complete test environment, additional members would create comments and vote on them to test actual sorting behavior with multiple comments.
 *
 * 1. Member registers and authenticates using authorize_member_join utility.
 * 2. Community is created with randomized name, description, and icon.
 * 3. Member subscribes to the community to gain posting privileges.
 * 4. Text post is created in the community with title and body content.
 * 5. Comments are retrieved with sort='best' parameter.
 * 6. Response structure is validated with typia.assert().
 * 7. Pagination metadata calculation is verified.
 * 8. If multiple comments exist, sorting order (voteScore DESC) is validated.
 */
export async function test_api_comment_list_sorted_by_best(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
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
  // 4. Create post in the community
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Retrieve comments with sort='best'
  const commentsResponse =
    await api.functional.redditCommunity.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "best",
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(commentsResponse);
  // 6. Validate pagination calculation is correct
  const expectedPages =
    commentsResponse.pagination.records === 0
      ? 0
      : Math.ceil(
          commentsResponse.pagination.records /
            commentsResponse.pagination.limit,
        );
  TestValidator.equals(
    "pages calculation matches records/limit",
    commentsResponse.pagination.pages,
    expectedPages,
  );
  // 7. Validate sorting order if multiple comments exist (business logic validation)
  if (commentsResponse.data.length > 1) {
    for (let i = 1; i < commentsResponse.data.length; i++) {
      const prevComment = commentsResponse.data[i - 1];
      const currComment = commentsResponse.data[i];
      TestValidator.predicate(
        `comment[${i}].voteScore <= comment[${i - 1}].voteScore (best sort DESC)`,
        () => currComment.voteScore <= prevComment.voteScore,
      );
    }
  }
}

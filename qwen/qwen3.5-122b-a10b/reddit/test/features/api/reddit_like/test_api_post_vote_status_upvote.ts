import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_votes_create } from "../../../generate/generate_random_reddit_like_member_posts_votes_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

/**
 * Test member upvote status retrieval on a post.
 *
 * Validates that when a member casts an upvote on a post, the vote status endpoint correctly returns the vote record with the upvote type and proper timestamps. This test ensures the voting system maintains accurate vote state and that the GET vote status endpoint properly retrieves active votes.
 *
 * The test follows the complete workflow: member registration, community creation, subscription, post creation, upvote casting, and vote status verification. Special attention is given to verifying the vote_type field equals 'upvote' and that timestamps are properly set.
 *
 * 1. Register a new member account with randomized credentials.
 * 2. Create a community with unique name and description.
 * 3. Subscribe the member to the newly created community.
 * 4. Create a text post in the community.
 * 5. Cast an upvote on the post.
 * 6. Retrieve the vote status and verify:
 *    - vote_type equals 'upvote'
 *    - created_at and updated_at timestamps are present
 *    - post reference matches the created post
 *    - deleted_at is null (active vote)
 */
export async function test_api_post_vote_status_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: `community_${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_like_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditLikeCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Cast upvote on post
  const vote = await generate_random_reddit_like_member_posts_votes_create(
    memberConnection,
    {
      body: {
        vote_type: "upvote",
      } satisfies IRedditLikeVote.ICreate,
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(vote);
  // 6. Retrieve and verify vote status
  const voteStatus = await api.functional.redditLike.member.posts.votes.at(
    memberConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(voteStatus);
  // Verify vote properties
  TestValidator.equals("vote type is upvote", voteStatus.vote_type, "upvote");
  TestValidator.predicate(
    "has created_at timestamp",
    () => voteStatus.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    () => voteStatus.updated_at.length > 0,
  );
  TestValidator.equals("post reference matches", voteStatus.post?.id, post.id);
  TestValidator.predicate(
    "vote is active (deleted_at is null)",
    () => voteStatus.deleted_at === null,
  );
}

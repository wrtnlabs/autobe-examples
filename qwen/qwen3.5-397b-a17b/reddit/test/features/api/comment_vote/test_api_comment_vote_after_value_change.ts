import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
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
import { generate_random_reddit_community_member_comments_votes_create } from "../../../generate/generate_random_reddit_community_member_comments_votes_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test retrieving a comment vote record after the member has changed their vote value from upvote to downvote.
 *
 * Validates that the vote record correctly reflects the updated vote value and updated_at timestamp after modification. This test ensures the complete vote lifecycle: initial vote casting, vote value modification, and accurate retrieval of the updated state.
 *
 * The test workflow establishes a complete Reddit community context including community creation, member subscription, post creation, and comment creation before testing the vote modification functionality.
 *
 * 1. Member registers and authenticates for all operations.
 * 2. Member creates a community to host the post.
 * 3. Member subscribes to the community to gain posting privileges.
 * 4. Member creates a text post in the community.
 * 5. Member creates a comment on the post to receive the vote.
 * 6. Member casts an initial upvote (+1) on the comment.
 * 7. Member updates the vote value from upvote (+1) to downvote (-1) using PUT operation.
 * 8. Member retrieves the vote record using GET operation.
 * 9. Validates that the retrieved vote shows value -1, updated_at is later than created_at, and vote metadata is intact.
 */
export async function test_api_comment_vote_after_value_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
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
  // 4. Create post
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
  // 5. Create comment
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Cast initial upvote (+1)
  const initialVote =
    await generate_random_reddit_community_member_comments_votes_create(
      memberConnection,
      {
        body: {
          value: 1,
        } satisfies IRedditCommunityCommentVote.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(initialVote);
  // 7. Update vote from upvote (+1) to downvote (-1)
  const updatedVote =
    await api.functional.redditCommunity.member.comments.votes.putByCommentidAndVoteid(
      memberConnection,
      {
        commentId: comment.id,
        voteId: initialVote.id,
        body: {
          value: -1,
        } satisfies IRedditCommunityCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // 8. Retrieve the vote record
  const retrievedVote =
    await api.functional.redditCommunity.member.comments.votes.at(
      memberConnection,
      {
        commentId: comment.id,
        voteId: initialVote.id,
      },
    );
  typia.assert(retrievedVote);
  // 9. Validate vote modification
  TestValidator.equals(
    "vote value updated to downvote",
    retrievedVote.value,
    -1,
  );
  TestValidator.predicate("updated_at is later than created_at", () => {
    const createdAt = new Date(retrievedVote.created_at).getTime();
    const updatedAt = new Date(retrievedVote.updated_at).getTime();
    return updatedAt > createdAt;
  });
  TestValidator.equals("vote id unchanged", retrievedVote.id, initialVote.id);
  TestValidator.equals(
    "member reference intact",
    retrievedVote.member.id,
    updatedVote.member.id,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import type { IRedditCloneVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_comments_vote_post_by_commentid } from "../../../generate/generate_random_reddit_clone_member_comments_vote_post_by_commentid";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";
import { prepare_random_reddit_clone_vote } from "../../../prepare/prepare_random_reddit_clone_vote";

/**
 * Test that a member can successfully remove their downvote from a comment.
 *
 * Setup: Create a member account, create a community, subscribe to the community,
 * create a post, create a comment, cast a downvote on the comment.
 *
 * Then execute the vote removal operation.
 *
 * Validate: The operation completes without error (204 No Content), and the member
 * can cast a new vote on the same comment after removal.
 */
export async function test_api_comment_vote_removal_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authenticated connection
  const memberAuth = await authorize_member_join(connection, {});
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 2. Create community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {},
  );
  // 3. Subscribe to community (already subscribed as creator, but create explicit subscription)
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: { community_id: community.id },
      },
    );
  // 4. Create post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "TEXT",
        text: { body: RandomGenerator.paragraph({ sentences: 3 }) },
      },
    },
  );
  // 5. Create comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { body: RandomGenerator.paragraph({ sentences: 2 }) },
      },
    );
  // 6. Cast downvote on the comment
  const downvote =
    await generate_random_reddit_clone_member_comments_vote_post_by_commentid(
      memberConnection,
      {
        params: { commentId: comment.id },
        body: { vote_type: "DOWNVOTE" },
      },
    );
  typia.assert(downvote);
  TestValidator.equals("vote type is downvote", downvote.vote_type, "DOWNVOTE");
  TestValidator.equals(
    "vote target is comment",
    downvote.target_id,
    comment.id,
  );
  // 7. Remove the downvote (DELETE operation - no utility function available)
  await api.functional.redditClone.member.comments.vote.erase(
    memberConnection,
    {
      commentId: comment.id,
    },
  );
  // 8. Verify member can cast a new vote on the same comment after removal
  const newVote =
    await generate_random_reddit_clone_member_comments_vote_post_by_commentid(
      memberConnection,
      {
        params: { commentId: comment.id },
        body: { vote_type: "UPVOTE" },
      },
    );
  typia.assert(newVote);
  TestValidator.equals("new vote type is upvote", newVote.vote_type, "UPVOTE");
  TestValidator.equals(
    "new vote target is same comment",
    newVote.target_id,
    comment.id,
  );
  TestValidator.notEquals("vote record is different", downvote.id, newVote.id);
}

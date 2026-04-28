import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentVote";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_comment_votes_create } from "../../../generate/generate_random_reddit_like_community_member_comment_votes_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_comment_vote } from "../../../prepare/prepare_random_reddit_like_community_comment_vote";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";

/**
 * Test member downvote removal on a comment authored by another member.
 *
 * Validates the complete downvote removal business workflow in a Reddit-like community. Two members participate: the comment author (Member A) and the voter (Member B). The test confirms that casting a downvote is successful, the downvote can be retracted by the voter, and the removal endpoint returns the deleted vote record with the correct downvote direction.
 *
 * Special attention is given to verifying that the removed vote accurately reflects the downvote direction and that the vote record references the correct comment and voter member.
 *
 * 1. Member A (author) registers and creates a community, subscribes, creates a post, and writes a comment.
 * 2. Initial comment vote score is validated to be 0.
 * 3. Member B (voter) registers and subscribes to the same community.
 * 4. Member B casts a downvote on Member A's comment.
 * 5. Member B removes their downvote via the retract endpoint.
 * 6. Validates the removed vote record confirms "downvote" direction and correct references.
 */
export async function test_api_comment_vote_downvote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (author) — register
  const authorConnection: api.IConnection = { host: connection.host };
  const authorInfo = await authorize_member_join(authorConnection, {
    body: {},
  });
  typia.assert(authorInfo);
  // 2. Member A creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      authorConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Member A subscribes to the community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    authorConnection,
    { body: { community_id: community.id } },
  );
  // 4. Member A creates a post in the community
  const post = await generate_random_reddit_like_community_member_posts_create(
    authorConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 5. Member A creates a comment on their post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      authorConnection,
      { params: { postId: post.id }, body: {} },
    );
  typia.assert(comment);
  // Validate initial comment score is 0 (no votes yet)
  TestValidator.equals("initial comment vote score is 0", comment.voteScore, 0);
  // 6. Member B (voter) — register
  const voterConnection: api.IConnection = { host: connection.host };
  const voterInfo = await authorize_member_join(voterConnection, { body: {} });
  typia.assert(voterInfo);
  // 7. Member B subscribes to the same community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    voterConnection,
    { body: { community_id: community.id } },
  );
  // 8. Member B casts a downvote on Member A's comment
  const downvote =
    await generate_random_reddit_like_community_member_comment_votes_create(
      voterConnection,
      { body: { comment_id: comment.id, direction: "downvote" } },
    );
  typia.assert(downvote);
  TestValidator.equals("cast vote is downvote", downvote.direction, "downvote");
  TestValidator.equals("comment IDs match", downvote.comment.id, comment.id);
  // 9. Member B removes their downvote
  const removedVote =
    await api.functional.redditLikeCommunity.member.votes.comments.remove.retract(
      voterConnection,
      { commentId: comment.id },
    );
  typia.assert(removedVote);
  // 10. Validate the removed vote record
  TestValidator.equals(
    "removed vote direction is downvote",
    removedVote.direction,
    "downvote",
  );
  TestValidator.equals(
    "removed vote comment matches",
    removedVote.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "removed vote member matches voter",
    removedVote.member.id,
    voterInfo.id,
  );
}

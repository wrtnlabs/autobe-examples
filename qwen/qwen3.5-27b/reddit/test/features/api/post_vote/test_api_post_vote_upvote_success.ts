import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_votes_create } from "../../../generate/generate_random_reddit_clone_member_posts_votes_create";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

/**
 * Test that an authenticated member can successfully upvote a post.
 *
 * Validates the complete post voting workflow including member authentication, post creation in a subscribed community, and upvote submission. Ensures that the vote score calculation is correct (increases by 1 for upvote), the post author's karma increases appropriately, and the returned vote entity contains all expected fields including vote_type, timestamps, and references to both the post and member.
 *
 * Special attention is given to verifying that the vote score reflects the upvote (+1) and that the author's karma score increases by 1 as a result of the upvote.
 *
 * 1. Authenticate a member via join utility function.
 * 2. Create a post in a subscribed community using the post creation utility.
 * 3. Capture the initial vote score (should be 0) and author karma.
 * 4. Submit an upvote on the post using the vote creation utility.
 * 5. Validate the returned vote entity has correct vote_type='upvote'.
 * 6. Verify the vote score increased by 1 (from 0 to 1).
 * 7. Verify the author's karma increased by 1.
 * 8. Validate vote entity contains proper references to post and member.
 */
export async function test_api_post_vote_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // Capture initial karma
  const initialKarma = member.karma;
  // 2. Create a post in a subscribed community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    { body: undefined },
  );
  typia.assert(post);
  // Capture initial vote score
  const initialVoteScore = post.vote_score;
  // 3. Submit an upvote on the post
  const vote = await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      body: { vote_type: "upvote" },
      params: { postId: post.id },
    },
  );
  typia.assert(vote);
  // 4. Validate vote entity
  TestValidator.equals("vote type is upvote", vote.vote_type, "upvote");
  TestValidator.equals("vote references correct post", vote.post.id, post.id);
  TestValidator.equals(
    "vote references correct member",
    vote.member.id,
    member.id,
  );
  TestValidator.predicate(
    "vote has created_at timestamp",
    vote.created_at !== undefined,
  );
  TestValidator.predicate(
    "vote has updated_at timestamp",
    vote.updated_at !== undefined,
  );
  TestValidator.equals("vote is not deleted", vote.deleted_at, null);
  // 5. Verify vote score increased by 1
  TestValidator.equals(
    "vote score increased by 1",
    vote.post.vote_score,
    initialVoteScore + 1,
  );
  // 6. Verify author karma increased by 1
  TestValidator.equals(
    "author karma increased by 1",
    vote.post.author.karma,
    initialKarma + 1,
  );
}

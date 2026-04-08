import api from "@ORGANIZATION/PROJECT-api";
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

import { prepare_random_reddit_clone_post_vote } from "../prepare/prepare_random_reddit_clone_post_vote";

/**
 * Generate a random post vote on a Reddit clone post for E2E testing.
 *
 * Creates a vote (upvote or downvote) on a specific post by calling the API.
 * The vote type is randomly selected between 'upvote' and 'downvote' to simulate
 * user voting behavior. The postId parameter specifies which post to vote on.
 *
 * This function uses the prepare function to generate valid test data, then
 * calls the API to create the actual vote resource. Each user can only have
 * one active vote per post, so calling this multiple times for the same
 * user-post combination will update the existing vote.
 */
export async function generate_random_reddit_clone_member_posts_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditClonePostVote.ICreate>;
    params: {
      postId: string;
    };
  },
): Promise<IRedditClonePostVote> {
  const prepared: IRedditClonePostVote.ICreate =
    prepare_random_reddit_clone_post_vote(props.body);
  return await api.functional.redditClone.member.posts.votes.create(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
    },
  );
}

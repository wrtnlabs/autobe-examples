import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_post_vote } from "../prepare/prepare_random_reddit_community_post_vote";

/**
 * Generate a random vote on a Reddit community post for E2E testing.
 *
 * Prepares random vote data using the prepare function, then calls the creation endpoint.
 * The vote can be either an upvote or downvote on a specific post identified by postId.
 * Returns the created or updated vote record with full details including author and post information.
 */
export async function generate_random_reddit_community_member_posts_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityPostVote.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<IRedditCommunityPostVote> {
  const prepared: IRedditCommunityPostVote.ICreate =
    prepare_random_reddit_community_post_vote(props.body);
  const result: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      body: prepared,
      postId: props.params.postId,
    });
  return result;
}

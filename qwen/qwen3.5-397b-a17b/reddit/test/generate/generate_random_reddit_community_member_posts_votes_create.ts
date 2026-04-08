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
 * Generate a random Reddit community post vote via the API for E2E testing.
 *
 * Prepares random vote data using the prepare function with a randomized vote value (+1 or -1),
 * then calls the vote creation endpoint to cast a vote on the specified post. The vote is
 * associated with the authenticated member from the session context.
 *
 * This function supports test-time customization through the optional body parameter,
 * allowing tests to override the vote value while auto-generating the rest. The postId
 * URL parameter is required to identify the target post for voting.
 *
 * @param connection API connection information for the test
 * @param props Optional body for vote customization and required postId URL parameter
 * @returns The created or updated vote record with full entity data
 */
export async function generate_random_reddit_community_member_posts_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityPostVote.ICreate>;
    params: {
      postId: string;
    };
  },
): Promise<IRedditCommunityPostVote> {
  const prepared: IRedditCommunityPostVote.ICreate =
    prepare_random_reddit_community_post_vote(props.body);
  const result: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: props.params.postId,
      body: prepared,
    });
  return result;
}

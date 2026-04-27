import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_comment_vote } from "../prepare/prepare_random_community_platform_comment_vote";

/**
 * Generate a random comment vote on a specific post's comment for E2E testing.
 *
 * Prepares random comment vote data using the prepare function, then calls the
 * vote creation endpoint with the specified post and comment identifiers. The
 * generated vote will have a random value of either +1 (upvote) or -1 (downvote).
 *
 * @param connection The API connection configuration
 * @param props Object containing optional body overrides and required URL parameters
 * @param props.body Optional partial vote creation data to override random values
 * @param props.params.postId UUID of the post containing the target comment
 * @param props.params.commentId UUID of the comment to receive the vote
 * @returns The created or updated vote record with full vote details
 */
export async function generate_random_community_platform_member_posts_comments_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommentVote.ICreate> | undefined;
    params: {
      postId: string;
      commentId: string;
    };
  }
): Promise<ICommunityPlatformCommentVote> {
  const prepared: ICommunityPlatformCommentVote.ICreate = prepare_random_community_platform_comment_vote(
    props.body,
  );
  return await api.functional.communityPlatform.member.posts.comments.votes.create(
    connection,
    {
      postId: props.params.postId,
      commentId: props.params.commentId,
      body: prepared,
    },
  );
}

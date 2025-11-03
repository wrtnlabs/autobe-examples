import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getRedditCommunityUserCommunitiesCommunityNamePostsPostIdVotesVoteId(props: {
  user: UserPayload;
  communityName: string;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPostVote> {
  const vote =
    await MyGlobal.prisma.reddit_community_post_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      select: {
        id: true,
        reddit_community_post_id: true,
        reddit_community_user_id: true,
        reddit_community_community_id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
      },
    });

  if (vote.reddit_community_post_id !== props.postId) {
    throw new HttpException("Vote does not belong to the specified post", 404);
  }

  return {
    id: vote.id,
    reddit_community_post_id: vote.reddit_community_post_id,
    reddit_community_user_id: vote.reddit_community_user_id,
    reddit_community_community_id: vote.reddit_community_community_id,
    vote_type: vote.vote_type,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  };
}

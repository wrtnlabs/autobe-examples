import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getRedditCommunityUserCommunitiesCommunityNameCommentsCommentIdVotesVoteId(props: {
  user: UserPayload;
  communityName: string;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentVote> {
  const { user, communityName, commentId, voteId } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const vote = await MyGlobal.prisma.reddit_community_comment_votes.findFirst({
    where: {
      id: voteId,
      reddit_community_comment_id: commentId,
      reddit_community_community_id: community.id,
      // Filter out soft-deleted votes if the model had deleted_at (not in schema)
    },
  });

  if (!vote) {
    throw new HttpException("Comment vote not found", 404);
  }

  return {
    id: vote.id,
    reddit_community_comment_id: vote.reddit_community_comment_id,
    reddit_community_user_id: vote.reddit_community_user_id,
    reddit_community_community_id: vote.reddit_community_community_id,
    vote_type: vote.vote_type,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  };
}

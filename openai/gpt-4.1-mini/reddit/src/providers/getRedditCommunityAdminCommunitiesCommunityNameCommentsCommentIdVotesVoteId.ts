import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminCommunitiesCommunityNameCommentsCommentIdVotesVoteId(props: {
  admin: AdminPayload;
  communityName: string;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentVote> {
  const { admin, communityName, commentId, voteId } = props;

  const vote =
    await MyGlobal.prisma.reddit_community_comment_votes.findFirstOrThrow({
      where: {
        id: voteId,
        reddit_community_comment_id: commentId,
        community: {
          name: communityName,
        },
      },
    });

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

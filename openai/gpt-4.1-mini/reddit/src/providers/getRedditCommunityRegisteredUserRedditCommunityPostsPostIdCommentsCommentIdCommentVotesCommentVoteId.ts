import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function getRedditCommunityRegisteredUserRedditCommunityPostsPostIdCommentsCommentIdCommentVotesCommentVoteId(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  commentVoteId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentVote> {
  const vote = await MyGlobal.prisma.reddit_community_comment_votes.findUnique({
    where: { id: props.commentVoteId },
  });

  if (
    vote === null ||
    vote.reddit_community_registereduser_id !== props.registeredUser.id
  ) {
    throw new HttpException("Comment vote not found", 404);
  }

  return {
    id: vote.id,
    reddit_community_comment_id: vote.reddit_community_comment_id,
    reddit_community_registereduser_id: vote.reddit_community_registereduser_id,
    reddit_community_registereduser_session_id:
      vote.reddit_community_registereduser_session_id,
    vote_type: vote.vote_type,
    created_at:
      vote.created_at !== null
        ? toISOStringSafe(vote.created_at)
        : (() => {
            throw new HttpException("Comment vote created_at is null", 500);
          })(),
    deleted_at:
      vote.deleted_at === null
        ? null
        : vote.deleted_at !== undefined
          ? toISOStringSafe(vote.deleted_at)
          : undefined,
  };
}

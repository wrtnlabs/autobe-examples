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

export async function putRedditCommunityRegisteredUserRedditCommunityPostsPostIdCommentsCommentIdCommentVotesCommentVoteId(props: {
  registeredUser: RegistereduserPayload;
  postId: string;
  commentId: string;
  commentVoteId: string;
  body: IRedditCommunityCommentVote.IUpdate;
}): Promise<IRedditCommunityCommentVote> {
  const existing =
    await MyGlobal.prisma.reddit_community_comment_votes.findUnique({
      where: { id: props.commentVoteId },
    });

  if (!existing) {
    throw new HttpException("Comment vote not found", 404);
  }

  if (existing.reddit_community_registereduser_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (existing.reddit_community_comment_id !== props.commentId) {
    throw new HttpException(
      "Comment vote does not belong to specified comment",
      400,
    );
  }

  const updated = await MyGlobal.prisma.reddit_community_comment_votes.update({
    where: { id: props.commentVoteId },
    data: {
      vote_type: props.body.vote_type,
    },
  });

  return {
    id: updated.id,
    reddit_community_comment_id: updated.reddit_community_comment_id,
    reddit_community_registereduser_id:
      updated.reddit_community_registereduser_id,
    reddit_community_registereduser_session_id:
      updated.reddit_community_registereduser_session_id,
    vote_type: updated.vote_type,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

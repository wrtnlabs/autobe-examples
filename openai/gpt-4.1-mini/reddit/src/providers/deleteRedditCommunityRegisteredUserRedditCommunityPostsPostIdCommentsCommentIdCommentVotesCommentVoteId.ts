import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function deleteRedditCommunityRegisteredUserRedditCommunityPostsPostIdCommentsCommentIdCommentVotesCommentVoteId(props: {
  registeredUser: RegistereduserPayload;
  postId: string;
  commentId: string;
  commentVoteId: string;
}): Promise<void> {
  const vote = await MyGlobal.prisma.reddit_community_comment_votes.findUnique({
    where: { id: props.commentVoteId },
  });

  if (!vote) {
    throw new HttpException("Comment vote not found", 404);
  }

  if (vote.reddit_community_registereduser_id !== props.registeredUser.id) {
    const moderator =
      await MyGlobal.prisma.reddit_community_moderators.findFirst({
        where: {
          id: props.registeredUser.id,
          deleted_at: null,
        },
      });

    if (!moderator) {
      throw new HttpException("Not authorized to delete this vote", 403);
    }
  }

  await MyGlobal.prisma.reddit_community_comment_votes.delete({
    where: { id: props.commentVoteId },
  });
}

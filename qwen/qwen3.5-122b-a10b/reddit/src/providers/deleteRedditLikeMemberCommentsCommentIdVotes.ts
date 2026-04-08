import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the vote record for this member on this comment
  const vote = await MyGlobal.prisma.reddit_like_votes.findFirst({
    where: {
      reddit_like_comment_id: props.commentId,
      reddit_like_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      vote_type: true,
      comment: {
        select: {
          reddit_like_member_id: true,
        },
      },
    },
  });
  // If no vote found, throw 404
  if (vote === null) {
    throw new HttpException("You have not voted on this comment", 404);
  }
  // If comment is null, throw error
  if (vote.comment === null) {
    throw new HttpException("Comment not found", 500);
  }
  // Get the comment author's profile
  const authorProfile =
    await MyGlobal.prisma.reddit_like_user_profiles.findUnique({
      where: {
        reddit_like_member_id: vote.comment.reddit_like_member_id,
        deleted_at: null,
      },
    });
  // If author profile not found, throw error
  if (authorProfile === null) {
    throw new HttpException("Author profile not found", 500);
  }
  // Determine karma adjustment direction
  const karmaAdjustment = vote.vote_type === "upvote" ? -1 : 1;
  // Soft delete the vote and update karma in a transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_like_votes.update({
      where: { id: vote.id },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.reddit_like_user_profiles.update({
      where: { id: authorProfile.id },
      data: {
        karma_score: {
          increment: karmaAdjustment,
        },
        updated_at: new Date(),
      },
    }),
  ]);
}

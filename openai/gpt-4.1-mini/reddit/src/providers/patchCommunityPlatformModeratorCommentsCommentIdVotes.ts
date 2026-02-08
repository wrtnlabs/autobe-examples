import { ICommunityPlatformCommentVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUsers";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorCommentsCommentIdVotes(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVoteOfUsers.ICreate;
}): Promise<ICommunityPlatformCommentVoteOfUsers | null> {
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const comment = await tx.community_platform_comments.findUnique({
      where: { id: props.commentId },
      select: { id: true, deleted_at: true },
    });
    if (!comment || comment.deleted_at !== null) {
      throw new HttpException("Comment not found", 404);
    }
    const existingVote =
      await tx.community_platform_comment_vote_of_users.findUnique({
        where: {
          community_platform_comment_id_community_platform_user_id: {
            community_platform_comment_id: props.commentId,
            community_platform_user_id: props.moderator.id,
          },
        },
      });
    // Extract vote_type from props.body safely
    const vote_type = (props.body as any).vote_type;
    if (
      vote_type !== "upvote" &&
      vote_type !== "downvote" &&
      vote_type !== undefined &&
      vote_type !== null &&
      vote_type !== ""
    ) {
      throw new HttpException("Invalid vote_type", 400);
    }
    if (vote_type === undefined || vote_type === null || vote_type === "") {
      if (existingVote) {
        await tx.community_platform_comment_vote_of_users.delete({
          where: { id: existingVote.id },
        });
      }
      return null;
    }
    let updatedVote;
    if (existingVote) {
      updatedVote = await tx.community_platform_comment_vote_of_users.update({
        where: { id: existingVote.id },
        data: {
          vote_type: vote_type,
          updated_at: toISOStringSafe(new Date()),
        },
      });
    } else {
      updatedVote = await tx.community_platform_comment_vote_of_users.create({
        data: {
          id: v4(),
          vote_type: vote_type,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
          deleted_at: null,
          comment: { connect: { id: props.commentId } },
          user: { connect: { id: props.moderator.id } },
        },
      });
    }
    // TODO: Implement karma update logic for comment votes
    return updatedVote;
  });
  return result;
}

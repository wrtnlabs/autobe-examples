import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformUserCommentVotesId(props: {
  user: UserPayload;
  id: string;
  body: IRedditPlatformCommentVote.IUpdate;
}): Promise<IRedditPlatformCommentVote> {
  // Find existing vote by ID
  const existingVote =
    await MyGlobal.prisma.reddit_platform_comment_votes.findUnique({
      where: { id: props.id },
    });
  // Validate vote exists and belongs to user
  if (!existingVote) {
    throw new HttpException("Comment vote not found", 404);
  }
  if (existingVote.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Update the vote type
  const updatedVote =
    await MyGlobal.prisma.reddit_platform_comment_votes.update({
      where: { id: props.id },
      data: {
        // Use the correct property name from IUpdate type
        ...props.body,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  // Return updated vote as response DTO
  return {
    id: updatedVote.id,
    user_id: updatedVote.user_id,
    comment_id: updatedVote.comment_id,
    vote_type: updatedVote.vote_type,
    created_at: toISOStringSafe(updatedVote.created_at),
    updated_at: toISOStringSafe(updatedVote.updated_at),
  };
}

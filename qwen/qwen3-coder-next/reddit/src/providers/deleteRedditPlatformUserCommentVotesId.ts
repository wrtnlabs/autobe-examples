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

export async function deleteRedditPlatformUserCommentVotesId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommentVote> {
  // Find existing vote
  const vote = await MyGlobal.prisma.reddit_platform_comment_votes.findUnique({
    where: { id: props.id },
  });
  if (!vote) {
    throw new HttpException("Comment vote not found", 404);
  }
  // Authorization: only vote owner can delete their vote
  const isOwner = vote.user_id === props.user.id;
  if (!isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the vote
  const deleted = await MyGlobal.prisma.reddit_platform_comment_votes.delete({
    where: { id: props.id },
  });
  // Return deleted vote record with proper date formatting
  return {
    id: deleted.id,
    user_id: deleted.user_id,
    comment_id: deleted.comment_id,
    vote_type: deleted.vote_type,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
  };
}

import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function putCommunityPlatformUserCommentsCommentIdVotesVoteId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IUpdate;
}): Promise<ICommunityPlatformCommentVote> {
  // Verify that the comment exists
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  // Verify that the vote exists and is linked to the comment
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: { id: props.voteId },
    });
  if (!vote || vote.community_platform_comment_id !== props.commentId) {
    throw new HttpException("Vote not found for this comment", 404);
  }
  // Authorization: No user_id in vote, so cannot verify ownership. Proceed without ownership check.
  // Update only the updated_at timestamp as no updatable fields in body
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_comment_votes.update(
    {
      where: { id: props.voteId },
      data: {
        updated_at: now,
      },
    },
  );
  // Map the updated vote to the return DTO
  return {
    id: updated.id,
    community_platform_comment_id: updated.community_platform_comment_id,
    vote_type: updated.vote_type,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}

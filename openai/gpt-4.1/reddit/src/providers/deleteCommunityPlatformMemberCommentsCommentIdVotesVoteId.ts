import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPlatformMemberCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, commentId, voteId } = props;

  // Find the vote: must match id, comment, not deleted, owned by this member
  const vote = await MyGlobal.prisma.community_platform_comment_votes.findFirst(
    {
      where: {
        id: voteId,
        community_platform_comment_id: commentId,
        deleted_at: null,
        community_platform_member_id: member.id,
      },
    },
  );

  if (!vote) {
    throw new HttpException(
      "Vote not found, not owned by you, or already deleted.",
      404,
    );
  }

  // Soft delete: set deleted_at (cannot use native Date)
  await MyGlobal.prisma.community_platform_comment_votes.update({
    where: { id: voteId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}

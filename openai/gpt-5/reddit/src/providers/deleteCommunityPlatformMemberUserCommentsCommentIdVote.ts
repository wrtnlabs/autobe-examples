import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function deleteCommunityPlatformMemberUserCommentsCommentIdVote(props: {
  memberUser: MemberuserPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { memberUser, commentId } = props;

  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: commentId },
    select: { id: true },
  });
  if (comment === null) {
    throw new HttpException("Not Found", 404);
  }

  const vote = await MyGlobal.prisma.community_platform_comment_votes.findFirst(
    {
      where: {
        community_platform_user_id: memberUser.id,
        community_platform_comment_id: commentId,
      },
      select: { id: true, deleted_at: true },
    },
  );

  if (vote === null) return;
  if (vote.deleted_at !== null) return;

  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_comment_votes.update({
    where: { id: vote.id },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}

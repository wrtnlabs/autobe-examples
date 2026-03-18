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

export async function deleteCommunityPlatformMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
    where: {
      id: props.commentId,
    },
    select: {
      id: true,
    },
  });
  const vote = await MyGlobal.prisma.community_platform_votes.findFirst({
    where: {
      member: {
        id: props.member.id,
      },
      deleted_at: null,
      commentTarget: {
        comment: {
          id: props.commentId,
        },
      },
    },
    select: {
      id: true,
    },
  });
  if (vote === null) {
    throw new HttpException("No active vote to remove", 409);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.community_platform_votes.delete({
      where: {
        id: vote.id,
      },
    });
  });
}

import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

export async function getCommunityPlatformCommentsCommentIdThreadSummary(props: {
  commentId: string;
}): Promise<ICommunityPlatformComment.ISummary> {
  const target = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      content: true,
      created_at: true,
      vote_score: true,
      _count: {
        select: {
          replies: true,
        },
      },
    },
  });
  if (!target) {
    throw new HttpException("Comment not found", 404);
  }
  return {
    id: target.id,
    content: target.content.substring(0, 300),
    voteScore: target.vote_score,
    createdAt: toISOStringSafe(target.created_at),
    replyCount: target._count.replies,
  };
}

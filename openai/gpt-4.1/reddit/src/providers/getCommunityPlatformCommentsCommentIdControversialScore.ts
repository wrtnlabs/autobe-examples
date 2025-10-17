import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformControversialScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformControversialScore";

export async function getCommunityPlatformCommentsCommentIdControversialScore(props: {
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformControversialScore> {
  const row =
    await MyGlobal.prisma.community_platform_controversial_scores.findFirst({
      where: { community_platform_comment_id: props.commentId },
    });
  if (!row)
    throw new HttpException("Controversial score for comment not found", 404);
  return {
    id: row.id,
    community_platform_post_id: row.community_platform_post_id ?? undefined,
    community_platform_comment_id:
      row.community_platform_comment_id ?? undefined,
    controversial_score: row.controversial_score,
    score_updated_at: toISOStringSafe(row.score_updated_at),
  };
}

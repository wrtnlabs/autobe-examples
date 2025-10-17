import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformControversialScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformControversialScore";

export async function getCommunityPlatformPostsPostIdControversialScore(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformControversialScore> {
  const record =
    await MyGlobal.prisma.community_platform_controversial_scores.findFirst({
      where: { community_platform_post_id: props.postId },
    });
  if (!record) {
    throw new HttpException(
      "Controversial score not found for the specified post.",
      404,
    );
  }
  return {
    id: record.id,
    community_platform_post_id: record.community_platform_post_id ?? undefined,
    community_platform_comment_id:
      record.community_platform_comment_id ?? undefined,
    controversial_score: record.controversial_score,
    score_updated_at: toISOStringSafe(record.score_updated_at),
  };
}

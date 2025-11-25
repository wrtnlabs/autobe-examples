import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformHotPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformHotPostRanking";

export async function getCommunityPlatformHotPostRankingsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformHotPostRanking> {
  const record =
    await MyGlobal.prisma.mv_community_platform_hot_post_rankings.findUnique({
      where: { post_id: props.postId },
    });
  if (!record) {
    throw new HttpException("Hot ranking for this post not found.", 404);
  }
  return {
    id: record.id,
    post_id: record.post_id,
    rank: record.rank,
    score: record.score,
    algorithm_version: record.algorithm_version,
    computed_at: toISOStringSafe(record.computed_at),
  };
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaStats } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaStats";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserKarmaStatsUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformKarmaStats> {
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: Cannot access other user's karma stats",
      403,
    );
  }

  const stats = await MyGlobal.prisma.community_platform_karma_stats.findFirst({
    where: { community_platform_user_id: props.userId },
  });
  if (!stats) {
    throw new HttpException("Karma stats not found", 404);
  }
  return {
    id: stats.id,
    community_platform_user_id: stats.community_platform_user_id,
    total_karma: stats.total_karma,
    post_karma: stats.post_karma,
    comment_karma: stats.comment_karma,
    lifetime_karma: stats.lifetime_karma,
    maximum_karma: stats.maximum_karma,
    created_at: toISOStringSafe(stats.created_at),
    updated_at: toISOStringSafe(stats.updated_at),
  };
}

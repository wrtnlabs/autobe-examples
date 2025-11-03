import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaStats } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaStats";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminKarmaStatsUserId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformKarmaStats> {
  const record =
    await MyGlobal.prisma.community_platform_karma_stats.findUnique({
      where: { community_platform_user_id: props.userId },
    });
  if (record === null) {
    throw new HttpException(
      "Karma stats not found for the specified user.",
      404,
    );
  }
  return {
    id: record.id,
    community_platform_user_id: record.community_platform_user_id,
    total_karma: record.total_karma,
    post_karma: record.post_karma,
    comment_karma: record.comment_karma,
    lifetime_karma: record.lifetime_karma,
    maximum_karma: record.maximum_karma,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}

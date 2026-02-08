import { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorModerationLogs(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerationLog.IRequest;
}): Promise<IPageICommunityPlatformModerationLog.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = 0;
  const whereConditions: Prisma.community_platform_moderation_logsWhereInput = {
    deleted_at: null,
  };
  const data =
    await MyGlobal.prisma.community_platform_moderation_logs.findMany({
      where: whereConditions,
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        moderator_id: true,
        post_id: true,
        comment_id: true,
        action_type: true,
        action_details: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const total = await MyGlobal.prisma.community_platform_moderation_logs.count({
    where: whereConditions,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      moderator_id: record.moderator_id,
      post_id: record.post_id ?? null,
      comment_id: record.comment_id ?? null,
      action_type: record.action_type,
      action_details: record.action_details ?? null,
      created_at: toISOStringSafe(record.created_at),
      updated_at: record.updated_at ? toISOStringSafe(record.updated_at) : null,
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
  };
}

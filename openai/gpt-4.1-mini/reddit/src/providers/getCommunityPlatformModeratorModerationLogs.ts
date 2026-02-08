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

export async function getCommunityPlatformModeratorModerationLogs(props: {
  moderator: ModeratorPayload;
}): Promise<IPageICommunityPlatformModerationLog> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
  } satisfies Prisma.community_platform_moderation_logsWhereInput;
  const orderByInput = {
    created_at: "desc",
  } satisfies Prisma.community_platform_moderation_logsOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.community_platform_moderation_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
    });
  const total = await MyGlobal.prisma.community_platform_moderation_logs.count({
    where: whereInput,
  });
  const data = records.map((record) => ({
    id: record.id,
    moderator_id: record.moderator_id,
    post_id: record.post_id === null ? null : record.post_id,
    comment_id: record.comment_id === null ? null : record.comment_id,
    action_type: record.action_type,
    action_details:
      record.action_details === null ? null : record.action_details,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}

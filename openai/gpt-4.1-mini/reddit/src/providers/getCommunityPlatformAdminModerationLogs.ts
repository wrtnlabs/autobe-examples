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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminModerationLogs(props: {
  admin: AdminPayload;
}): Promise<IPageICommunityPlatformModerationLog> {
  if (!props.admin) {
    throw new HttpException("Unauthorized", 401);
  }
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const records =
    await MyGlobal.prisma.community_platform_moderation_logs.findMany({
      skip,
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
      },
    });
  const total =
    await MyGlobal.prisma.community_platform_moderation_logs.count();
  const data = records.map((record) => ({
    id: record.id,
    moderator_id: record.moderator_id,
    post_id: record.post_id,
    comment_id: record.comment_id,
    action_type: record.action_type,
    action_details: record.action_details,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  }));
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return { pagination, data };
}

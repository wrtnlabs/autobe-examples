import { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformActivityLog";
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

export async function patchCommunityPlatformAdminActivityLogs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformActivityLog.IRequest;
}): Promise<IPageICommunityPlatformActivityLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.community_platform_activity_logsWhereInput = {
    deleted_at: null,
    ...(props.body.actionType && { action_type: props.body.actionType }),
    ...(props.body.userId && { user_id: props.body.userId }),
    ...(props.body.ipAddress && { ip_address: props.body.ipAddress }),
    ...(props.body.createdAtFrom || props.body.createdAtTo
      ? {
          created_at: {
            ...(props.body.createdAtFrom && { gte: props.body.createdAtFrom }),
            ...(props.body.createdAtTo && { lte: props.body.createdAtTo }),
          },
        }
      : {}),
  };
  const records =
    await MyGlobal.prisma.community_platform_activity_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: { user: true },
    });
  const total = await MyGlobal.prisma.community_platform_activity_logs.count({
    where,
  });
  const data = records.map((record) => ({
    id: record.id,
    user: record.user
      ? {
          id: record.user.id,
          email: record.user.email,
          username: record.user.username,
          displayName: record.user.display_name,
          bio: record.user.bio ?? null,
          avatarUrl: record.user.avatar_url ?? null,
          karma: record.user.karma,
          createdAt: toISOStringSafe(record.user.created_at),
          updatedAt: toISOStringSafe(record.user.updated_at),
          deletedAt: record.user.deleted_at
            ? toISOStringSafe(record.user.deleted_at)
            : null,
        }
      : null,
    actionType: record.action_type,
    ipAddress: record.ip_address ?? null,
    userAgent: record.user_agent ?? null,
    metadata: record.metadata ?? null,
    createdAt: toISOStringSafe(record.created_at),
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}

import { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
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

export async function patchCommunityPlatformAdminActivityLogsAnalytics(props: {
  admin: AdminPayload;
  body: ICommunityPlatformActivityLog.IRequest & {
    actionType?: string[];
    userId?: string & tags.Format<"uuid">;
    startDate?: string & tags.Format<"date-time">;
    endDate?: string & tags.Format<"date-time">;
    limit?: number;
    offset?: number;
    sortBy?: "created_at" | "updated_at";
  };
}): Promise<IPageICommunityPlatformActivityLog.ISummary> {
  const { actionType, userId, startDate, endDate, limit, offset, sortBy } =
    props.body;
  const actualLimit = limit && limit > 0 ? limit : 100;
  const actualOffset = offset && offset >= 0 ? offset : 0;
  // Build where condition
  const where: Prisma.community_platform_activity_logsWhereInput = {};
  if (actionType && actionType.length > 0) {
    where.action_type = { in: actionType };
  }
  if (userId) {
    where.user_id = userId;
  }
  if (startDate && endDate) {
    where.created_at = { gte: startDate, lte: endDate };
  } else if (startDate) {
    where.created_at = { gte: startDate };
  } else if (endDate) {
    where.created_at = { lte: endDate };
  }
  const orderBy: Prisma.community_platform_activity_logsOrderByWithRelationInput =
    sortBy === "updated_at" ? { updated_at: "desc" } : { created_at: "desc" };
  const data = await MyGlobal.prisma.community_platform_activity_logs.findMany({
    where,
    orderBy,
    skip: actualOffset,
    take: actualLimit,
  });
  const total = await MyGlobal.prisma.community_platform_activity_logs.count({
    where,
  });
  // Map the records to the response DTO
  const mappedData: ICommunityPlatformActivityLog.ISummary[] = data.map(
    (record) => ({
      id: record.id,
      user_id: record.user_id,
      action_type: record.action_type,
      ip_address: record.ip_address,
      user_agent: record.user_agent,
      created_at: record.created_at,
      updated_at: record.updated_at,
    }),
  );
  return {
    data: mappedData,
    pagination: {
      current: Math.floor(actualOffset / actualLimit) + 1,
      limit: actualLimit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / actualLimit),
    },
  };
}

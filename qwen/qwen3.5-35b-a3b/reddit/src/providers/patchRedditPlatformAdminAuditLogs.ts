import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAdminAuditLog";
import { IRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminAuditLog";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformAdminAuditLogTransformer } from "../transformers/RedditPlatformAdminAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IRedditPlatformAdminAuditLog.IRequest;
}): Promise<IPageIRedditPlatformAdminAuditLog.ISummary> {
  // Validate pagination parameters
  const page = props.body.page;
  const limit = props.body.limit;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  // Validate date range
  if (props.body.startDate && props.body.endDate) {
    const startDate = new Date(props.body.startDate);
    const endDate = new Date(props.body.endDate);
    if (startDate > endDate) {
      throw new HttpException("Start date must be before end date", 400);
    }
  }
  // Build where clause for admin audit logs
  const whereInput: Prisma.reddit_platform_admin_audit_logsWhereInput = {
    ...(props.body.adminIds !== undefined && props.body.adminIds.length > 0
      ? { admin_id: { in: props.body.adminIds } }
      : {}),
    ...(props.body.actionTypes !== undefined &&
    props.body.actionTypes.length > 0
      ? { action_type: { in: props.body.actionTypes } }
      : {}),
    ...(props.body.startDate !== undefined
      ? { created_at: { gte: new Date(props.body.startDate) } }
      : {}),
    ...(props.body.endDate !== undefined
      ? { created_at: { lte: new Date(props.body.endDate) } }
      : {}),
  };
  // Build order by - default to created_at descending
  const orderByInput: Prisma.reddit_platform_admin_audit_logsOrderByWithRelationInput[] =
    (
      props.body.sortBy === "action_type"
        ? [
            {
              action_type:
                props.body.sortOrder === "asc" ? "asc" : ("desc" as const),
            },
          ]
        : props.body.sortBy === "timestamp"
          ? [
              {
                created_at:
                  props.body.sortOrder === "asc" ? "asc" : ("desc" as const),
              },
            ]
          : [{ created_at: "desc" as const }]
    ) satisfies Prisma.reddit_platform_admin_audit_logsOrderByWithRelationInput[];
  const skip = (page - 1) * limit;
  // Execute query with transformer select
  const data = await MyGlobal.prisma.reddit_platform_admin_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditPlatformAdminAuditLogTransformer.select(),
  });
  // Execute count for total records
  const total = await MyGlobal.prisma.reddit_platform_admin_audit_logs.count({
    where: whereInput,
  });
  // Transform records
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditPlatformAdminAuditLogTransformer.transform,
  );
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData as unknown as IPageIRedditPlatformAdminAuditLog.ISummary["data"],
  } as IPageIRedditPlatformAdminAuditLog.ISummary;
}

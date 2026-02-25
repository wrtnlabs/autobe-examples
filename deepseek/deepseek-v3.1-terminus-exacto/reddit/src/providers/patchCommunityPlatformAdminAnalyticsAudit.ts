import { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformAuditLogAtSummaryTransformer } from "../transformers/CommunityPlatformAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminAnalyticsAudit(props: {
  admin: AdminPayload;
  body: ICommunityPlatformAuditLog.IRequest;
}): Promise<IPageICommunityPlatformAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.community_platform_audit_logsWhereInput = {
    ...(props.body.actor_type && { actor_type: props.body.actor_type }),
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.success !== undefined && { success: props.body.success }),
    ...(props.body.ip_address && {
      ip_address: { contains: props.body.ip_address },
    }),
    ...(props.body.community_id && { community_id: props.body.community_id }),
    ...(props.body.post_id && { post_id: props.body.post_id }),
    ...(props.body.comment_id && { comment_id: props.body.comment_id }),
  };
  // Handle date range filtering without using Date constructor
  if (props.body.start_date || props.body.end_date) {
    const dateConditions: Prisma.community_platform_audit_logsWhereInput = {};
    if (props.body.start_date && props.body.end_date) {
      dateConditions.created_at = {
        gte: new Date(props.body.start_date),
        lte: new Date(props.body.end_date),
      };
    } else if (props.body.start_date) {
      dateConditions.created_at = {
        gte: new Date(props.body.start_date),
      };
    } else if (props.body.end_date) {
      dateConditions.created_at = {
        lte: new Date(props.body.end_date),
      };
    }
    Object.assign(whereInput, dateConditions);
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_audit_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformAuditLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_audit_logs.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformAuditLogAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}

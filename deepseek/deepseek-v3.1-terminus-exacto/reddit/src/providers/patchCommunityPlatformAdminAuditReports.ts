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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminAuditReports(props: {
  admin: AdminPayload;
  body: ICommunityPlatformAuditLog.IRequest;
}): Promise<IPageICommunityPlatformAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper string-based date handling
  const whereInput = {
    ...(props.body.actor_type && { actor_type: props.body.actor_type }),
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.success !== undefined && { success: props.body.success }),
    ...(props.body.ip_address && {
      ip_address: { contains: props.body.ip_address },
    }),
    ...(props.body.community_id && { community_id: props.body.community_id }),
    ...(props.body.post_id && { post_id: props.body.post_id }),
    ...(props.body.comment_id && { comment_id: props.body.comment_id }),
    ...(props.body.start_date &&
      props.body.end_date && {
        created_at: {
          gte: props.body.start_date,
          lte: props.body.end_date,
        },
      }),
    ...(props.body.start_date &&
      !props.body.end_date && {
        created_at: { gte: props.body.start_date },
      }),
    ...(props.body.end_date &&
      !props.body.start_date && {
        created_at: { lte: props.body.end_date },
      }),
  } satisfies Prisma.community_platform_audit_logsWhereInput;
  // Execute queries sequentially as required
  const data = await MyGlobal.prisma.community_platform_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      actor_type: true,
      action_type: true,
      success: true,
      ip_address: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.community_platform_audit_logs.count({
    where: whereInput,
  });
  // Transform to summary DTO using ArrayUtil.asyncMap
  const summaries = await ArrayUtil.asyncMap(
    data,
    async (record) =>
      ({
        id: record.id as string & tags.Format<"uuid">,
        actor_type: record.actor_type,
        action_type: record.action_type,
        success: record.success,
        ip_address: record.ip_address as string & tags.Format<"ipv4">,
        created_at: record.created_at.toISOString() as string &
          tags.Format<"date-time">,
      }) satisfies ICommunityPlatformAuditLog.ISummary,
  );
  return {
    data: summaries,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit) || 0,
    } satisfies IPage.IPagination,
  } satisfies IPageICommunityPlatformAuditLog.ISummary;
}

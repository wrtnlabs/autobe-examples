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

export async function patchCommunityPlatformAdminAuditLogs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformAuditLog.IRequest;
}): Promise<IPageICommunityPlatformAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build dynamic WHERE clause
  const whereInput: Prisma.community_platform_audit_logsWhereInput = {};
  if (props.body.actor_type) {
    whereInput.actor_type = props.body.actor_type;
  }
  if (props.body.action_type) {
    whereInput.action_type = props.body.action_type;
  }
  if (props.body.success !== undefined) {
    whereInput.success = props.body.success;
  }
  if (props.body.ip_address) {
    whereInput.ip_address = { contains: props.body.ip_address };
  }
  if (props.body.community_id) {
    whereInput.community_id = props.body.community_id;
  }
  if (props.body.post_id) {
    whereInput.post_id = props.body.post_id;
  }
  if (props.body.comment_id) {
    whereInput.comment_id = props.body.comment_id;
  }
  if (props.body.start_date || props.body.end_date) {
    whereInput.created_at = {};
    if (props.body.start_date) {
      whereInput.created_at.gte = props.body.start_date;
    }
    if (props.body.end_date) {
      whereInput.created_at.lte = props.body.end_date;
    }
  }
  // Execute queries sequentially for better error handling
  const data = await MyGlobal.prisma.community_platform_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.community_platform_audit_logs.count({
    where: whereInput,
  });
  // Transform using the available transformer pattern
  const transformedData = data.map((record) => ({
    id: record.id,
    actor_type: record.actor_type,
    action_type: record.action_type,
    success: record.success,
    ip_address: record.ip_address,
    created_at: toISOStringSafe(record.created_at),
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}

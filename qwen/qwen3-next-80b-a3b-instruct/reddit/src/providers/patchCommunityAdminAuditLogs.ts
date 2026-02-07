import { ICommunityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityAuditLogAtSummaryTransformer } from "../transformers/CommunityAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityAdminAuditLogs(props: {
  admin: AdminPayload;
  body: ICommunityAuditLog.IRequest;
}): Promise<IPageICommunityAuditLog.ISummary> {
  // Type assertion: We know from operation specification these properties should exist
  const request = props.body as unknown as {
    moderator_id?: string & tags.Format<"uuid">;
    target_id?: string & tags.Format<"uuid">;
    target_type?: "post" | "comment" | "report";
    action_type?:
      | "delete_post"
      | "ban_user"
      | "approve_report"
      | "dismiss_report";
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    page?: number;
    limit?: number;
  };
  const page = request.page ?? 1;
  const limit = request.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build filter conditions
  const where: Prisma.community_audit_logsWhereInput = {};
  // Filter by moderator_id
  if (request.moderator_id) {
    where.moderator_id = request.moderator_id;
  }
  // Filter by target_id
  if (request.target_id) {
    where.target_id = request.target_id;
  }
  // Filter by target_type
  if (request.target_type) {
    where.target_type = request.target_type;
  }
  // Filter by action_type
  if (request.action_type) {
    where.action_type = request.action_type;
  }
  // Filter by created_at range
  if (request.created_at) {
    where.created_at = {};
    if (request.created_at.gte) {
      where.created_at.gte = request.created_at.gte;
    }
    if (request.created_at.lte) {
      where.created_at.lte = request.created_at.lte;
    }
  }
  // Query for data
  const data = await MyGlobal.prisma.community_audit_logs.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityAuditLogAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.community_audit_logs.count({
    where,
  });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}

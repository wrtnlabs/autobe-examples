import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import { IPageICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminAuditLogs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformAuditLog.IRequest;
}): Promise<IPageICommunityPlatformAuditLog> {
  const {
    actor_type,
    actor_id,
    action,
    target_type,
    target_id,
    metadata_contains,
    created_from,
    created_to,
    page,
    limit,
    sort_by,
    sort_order,
  } = props.body;

  // Defaults
  const pageNum = page ?? 1;
  const takeNum = limit ?? 20;
  const skipNum = (pageNum - 1) * takeNum;
  const sortField = sort_by ?? "created_at";
  const sortDirection = sort_order ?? "desc";

  // Build where condition
  const where = {
    ...(actor_type !== undefined &&
      actor_type !== null &&
      actor_type !== "" && { actor_type }),
    ...(actor_id !== undefined &&
      actor_id !== null &&
      actor_id !== "" && { actor_id }),
    ...(action !== undefined && action !== null && action !== "" && { action }),
    ...(target_type !== undefined &&
      target_type !== null &&
      target_type !== "" && { target_type }),
    ...(target_id !== undefined &&
      target_id !== null &&
      target_id !== "" && { target_id }),
    ...(metadata_contains !== undefined &&
      metadata_contains !== null &&
      metadata_contains !== "" && {
        metadata: { contains: metadata_contains },
      }),
    ...(created_from !== undefined &&
    created_to !== undefined &&
    created_from !== null &&
    created_to !== null
      ? { created_at: { gte: created_from, lte: created_to } }
      : created_from !== undefined && created_from !== null
        ? { created_at: { gte: created_from } }
        : created_to !== undefined && created_to !== null
          ? { created_at: { lte: created_to } }
          : {}),
  };

  // Query
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.community_platform_audit_logs.count({ where }),
    MyGlobal.prisma.community_platform_audit_logs.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
      skip: skipNum,
      take: takeNum,
    }),
  ]);

  // Map audit logs
  const data = rows.map((row) => {
    return {
      id: row.id,
      actor_type: row.actor_type,
      actor_id: row.actor_id,
      action: row.action,
      target_type: row.target_type,
      target_id: row.target_id,
      metadata: row.metadata ?? undefined,
      created_at: toISOStringSafe(row.created_at),
    };
  });

  // Pagination info
  const pagination = {
    current: Number(pageNum),
    limit: Number(takeNum),
    records: total,
    pages: Math.ceil(total / takeNum),
  };

  return { pagination, data };
}

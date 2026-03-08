import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAdminAuditLog";
import { IRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminAuditLog";
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

export async function patchRedditPlatformAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IRedditPlatformAdminAuditLog.IRequest;
}): Promise<IPageIRedditPlatformAdminAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const offset = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortDirection = props.body.sortDirection ?? "desc";
  // Validate pagination
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  // Build date filters
  const startDate = props.body.startDate ?? null;
  const endDate = props.body.endDate ?? null;
  // Validate date format if provided
  if (
    startDate !== null &&
    !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?/.test(
      startDate,
    )
  ) {
    throw new HttpException("Invalid start date format", 400);
  }
  if (
    endDate !== null &&
    !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?/.test(
      endDate,
    )
  ) {
    throw new HttpException("Invalid end date format", 400);
  }
  // Build query parameters
  const params: Array<string | number | null> = [];
  const whereConditions: string[] = [];
  // Admin log filters
  if (props.body.adminId !== undefined) {
    whereConditions.push("a.admin_id = $" + (params.length + 1));
    params.push(props.body.adminId);
  }
  if (props.body.sessionId !== undefined) {
    whereConditions.push("a.session_id = $" + (params.length + 1));
    params.push(props.body.sessionId);
  }
  if (props.body.actionType !== undefined) {
    whereConditions.push("a.action_type = $" + (params.length + 1));
    params.push(props.body.actionType);
  }
  if (props.body.actionStatus !== undefined) {
    whereConditions.push("a.action_status = $" + (params.length + 1));
    params.push(props.body.actionStatus);
  }
  if (props.body.targetEntityType !== undefined) {
    whereConditions.push("a.target_entity_type = $" + (params.length + 1));
    params.push(props.body.targetEntityType);
  }
  if (props.body.targetEntityId !== undefined) {
    whereConditions.push("a.target_entity_id = $" + (params.length + 1));
    params.push(props.body.targetEntityId);
  }
  if (props.body.ipAddress !== undefined) {
    whereConditions.push("a.ip_address = $" + (params.length + 1));
    params.push(props.body.ipAddress);
  }
  if (startDate !== null) {
    whereConditions.push("a.created_at >= $" + (params.length + 1));
    params.push(startDate);
  }
  if (endDate !== null) {
    whereConditions.push("a.created_at <= $" + (params.length + 1));
    params.push(endDate);
  }
  // Moderation log filters
  const modWhereConditions: string[] = [];
  if (props.body.adminId !== undefined) {
    modWhereConditions.push("m.moderator_id = $" + (params.length + 1));
    params.push(props.body.adminId);
  }
  if (props.body.actionType !== undefined) {
    modWhereConditions.push("m.action_type = $" + (params.length + 1));
    params.push(props.body.actionType);
  }
  if (startDate !== null) {
    modWhereConditions.push("m.created_at >= $" + (params.length + 1));
    params.push(startDate);
  }
  if (endDate !== null) {
    modWhereConditions.push("m.created_at <= $" + (params.length + 1));
    params.push(endDate);
  }
  // Build ORDER BY clause
  const orderByFieldMap: Record<string, string> = {
    created_at: "created_at",
    admin_id: "admin_id",
    action_type: "action_type",
  };
  const orderField = orderByFieldMap[sortBy] ?? "created_at";
  const orderDir = sortDirection === "asc" ? "ASC" : "DESC";
  // Build UNION query
  const unionSql = `
    SELECT 
      id,
      action_type,
      action_status,
      'ADMIN'::text AS audit_log_type,
      created_at,
      admin_id AS actor_id,
      ip_address,
      referrer,
      session_id,
      target_entity_id,
      target_entity_type,
      user_agent
    FROM reddit_platform_admin_audit_logs
    WHERE ${whereConditions.length > 0 ? whereConditions.join(" AND ") : "1=1"}

    UNION ALL

    SELECT 
      id,
      action_type,
      NULL::text AS action_status,
      'MODERATOR'::text AS audit_log_type,
      created_at,
      moderator_id AS actor_id,
      NULL::text AS ip_address,
      NULL::text AS referrer,
      NULL::text AS session_id,
      NULL::text AS target_entity_id,
      action_target_type AS target_entity_type,
      NULL::text AS user_agent
    FROM reddit_platform_moderation_audit_logs
    WHERE ${modWhereConditions.length > 0 ? modWhereConditions.join(" AND ") : "1=1"}
  `;
  // Fetch paginated results
  const logsResult = await MyGlobal.prisma.$queryRawUnsafe<
    Array<{
      id: string;
      action_type: string;
      action_status: string | null;
      audit_log_type: string;
      created_at: string;
      actor_id: string;
      ip_address: string | null;
      referrer: string | null;
      session_id: string | null;
      target_entity_id: string | null;
      target_entity_type: string | null;
      user_agent: string | null;
    }>
  >(
    unionSql +
      ` ORDER BY ${orderField} ${orderDir} LIMIT ${params.length + 1} OFFSET ${params.length + 2}`,
    ...params,
  );
  // Transform results to DTO format
  const data: IRedditPlatformAdminAuditLog.ISummary[] = logsResult.map(
    (row): IRedditPlatformAdminAuditLog.ISummary => ({
      id: row.id as string & tags.Format<"uuid">,
      action_type: row.action_type,
      action_status: row.action_status ?? "",
      audit_log_type: row.audit_log_type as "ADMIN" | "MODERATOR",
      created_at: row.created_at as string & tags.Format<"date-time">,
      actor_id: row.actor_id as string & tags.Format<"uuid">,
      ip_address: row.ip_address,
      referrer: row.referrer,
      session_id: row.session_id as (string & tags.Format<"uuid">) | null,
      target_entity_id: row.target_entity_id as
        | (string & tags.Format<"uuid">)
        | null,
      target_entity_type: row.target_entity_type,
      user_agent: row.user_agent,
    }),
  );
  // Count total records
  const adminCountSql = `
    SELECT COUNT(*) as count FROM reddit_platform_admin_audit_logs
    WHERE ${whereConditions.length > 0 ? whereConditions.join(" AND ") : "1=1"}
  `;
  const modCountSql = `
    SELECT COUNT(*) as count FROM reddit_platform_moderation_audit_logs
    WHERE ${modWhereConditions.length > 0 ? modWhereConditions.join(" AND ") : "1=1"}
  `;
  const [adminCountResult, modCountResult] = await Promise.all([
    MyGlobal.prisma.$queryRawUnsafe<
      Array<{
        count: string;
      }>
    >(adminCountSql),
    MyGlobal.prisma.$queryRawUnsafe<
      Array<{
        count: string;
      }>
    >(modCountSql),
  ]);
  const adminTotal =
    adminCountResult.length > 0 ? parseInt(adminCountResult[0].count, 10) : 0;
  const modTotal =
    modCountResult.length > 0 ? parseInt(modCountResult[0].count, 10) : 0;
  const total = adminTotal + modTotal;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}

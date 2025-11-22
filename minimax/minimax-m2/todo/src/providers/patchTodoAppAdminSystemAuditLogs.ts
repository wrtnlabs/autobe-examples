import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminSystemAuditLogs(props: {
  admin: AdminPayload;
  body: ITodoAppAuditLog.IRequest;
}): Promise<IPageITodoAppAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where conditions dynamically
  const whereCondition: Record<string, unknown> = {};

  // Handle soft deletion based on include_deleted parameter
  if (!props.body.include_deleted) {
    whereCondition.deleted_at = null;
  }

  // Apply filters based on request parameters
  if (props.body.action_type) {
    whereCondition.action_type = props.body.action_type;
  }

  if (props.body.entity_type) {
    whereCondition.entity_type = props.body.entity_type;
  }

  if (props.body.severity_level) {
    whereCondition.severity_level = props.body.severity_level;
  }

  if (props.body.actor_member_id) {
    whereCondition.actor_member_id = props.body.actor_member_id;
  }

  if (props.body.actor_administrator_id) {
    whereCondition.actor_administrator_id = props.body.actor_administrator_id;
  }

  if (props.body.target_member_id) {
    whereCondition.target_member_id = props.body.target_member_id;
  }

  if (props.body.target_todo_id) {
    whereCondition.target_todo_id = props.body.target_todo_id;
  }

  // Handle date range filtering
  if (props.body.created_after || props.body.created_before) {
    (whereCondition as any).created_at = {};
    if (props.body.created_after) {
      (whereCondition as any).created_at.gte = props.body.created_after;
    }
    if (props.body.created_before) {
      (whereCondition as any).created_at.lte = props.body.created_before;
    }
  }

  // Handle full-text search
  if (props.body.search) {
    whereCondition.OR = [
      {
        action_description: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
      {
        user_agent: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
    ];
  }

  // Determine sort order
  const orderBy: Record<string, "asc" | "desc"> = {};
  const orderField = props.body.order_by ?? "created_at";
  const orderDirection = props.body.order_direction ?? "desc";
  orderBy[orderField] = orderDirection;

  // Execute query with pagination
  const [auditLogs, total] = await Promise.all([
    MyGlobal.prisma.todo_app_audit_logs.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        actor_member_id: true,
        actor_administrator_id: true,
        action_type: true,
        entity_type: true,
        target_member_id: true,
        target_todo_id: true,
        old_values: true,
        new_values: true,
        severity_level: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.todo_app_audit_logs.count({
      where: whereCondition,
    }),
  ]);

  // Transform results to match API format - convert null to undefined for nullable fields
  const data = auditLogs.map((log) => ({
    id: log.id,
    actor_member_id: log.actor_member_id ?? undefined,
    actor_administrator_id: log.actor_administrator_id ?? undefined,
    action_type: log.action_type,
    entity_type: log.entity_type,
    target_member_id: log.target_member_id ?? undefined,
    target_todo_id: log.target_todo_id ?? undefined,
    old_values: log.old_values ?? undefined,
    new_values: log.new_values ?? undefined,
    severity_level: log.severity_level,
    created_at: toISOStringSafe(log.created_at),
  }));

  // Calculate pagination metadata
  const pages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
  };
}

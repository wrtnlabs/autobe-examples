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

export async function patchTodoAppAdminAdministratorsAdministratorIdAuditLogs(props: {
  admin: AdminPayload;
  administratorId: string & tags.Format<"uuid">;
  body: ITodoAppAuditLog.IRequest;
}): Promise<IPageITodoAppAuditLog> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> & {
      created_at?: { gte?: string; lte?: string };
    } = {
      actor_administrator_id: props.administratorId,
    };

    // Filter by specific action type
    if (props.body.action_type) {
      conditions.action_type = props.body.action_type;
    }

    // Filter by specific entity type
    if (props.body.entity_type) {
      conditions.entity_type = props.body.entity_type;
    }

    // Filter by severity level
    if (props.body.severity_level) {
      conditions.severity_level = props.body.severity_level;
    }

    // Filter by specific member actor
    if (props.body.actor_member_id) {
      conditions.actor_member_id = props.body.actor_member_id;
    }

    // Filter by specific member target
    if (props.body.target_member_id) {
      conditions.target_member_id = props.body.target_member_id;
    }

    // Filter by specific todo target
    if (props.body.target_todo_id) {
      conditions.target_todo_id = props.body.target_todo_id;
    }

    // Handle soft delete filtering
    if (!props.body.include_deleted) {
      conditions.deleted_at = null;
    }

    // Date range filtering
    if (props.body.created_after || props.body.created_before) {
      conditions.created_at = {} as { gte?: string; lte?: string };
      if (props.body.created_after) {
        conditions.created_at.gte = props.body.created_after;
      }
      if (props.body.created_before) {
        conditions.created_at.lte = props.body.created_before;
      }
    }

    // Full-text search using GIN indexes
    if (props.body.search) {
      conditions.OR = [
        { action_description: { contains: props.body.search } },
        { user_agent: { contains: props.body.search } },
      ];
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  // Build order by clause with validation
  const validOrderFields = [
    "created_at",
    "updated_at",
    "action_type",
    "severity_level",
  ];
  const orderByField = validOrderFields.includes(props.body.order_by || "")
    ? props.body.order_by
    : "created_at";
  const orderDirection = props.body.order_direction === "asc" ? "asc" : "desc";

  const orderBy = {
    [orderByField!]: orderDirection,
  };

  const [auditLogs, total] = await Promise.all([
    MyGlobal.prisma.todo_app_audit_logs.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_app_audit_logs.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: auditLogs.map((auditLog) => ({
      id: auditLog.id,
      actor_member_id: auditLog.actor_member_id ?? undefined,
      actor_administrator_id: auditLog.actor_administrator_id ?? undefined,
      target_member_id: auditLog.target_member_id ?? undefined,
      target_todo_id: auditLog.target_todo_id ?? undefined,
      action_type: auditLog.action_type,
      action_description: auditLog.action_description,
      entity_type: auditLog.entity_type,
      entity_id: auditLog.entity_id ?? undefined,
      old_values: auditLog.old_values ?? undefined,
      new_values: auditLog.new_values ?? undefined,
      ip_address: auditLog.ip_address ?? undefined,
      user_agent: auditLog.user_agent ?? undefined,
      session_id: auditLog.session_id ?? undefined,
      request_id: auditLog.request_id ?? undefined,
      severity_level: auditLog.severity_level,
      created_at: toISOStringSafe(auditLog.created_at),
      updated_at: auditLog.updated_at
        ? toISOStringSafe(auditLog.updated_at)
        : undefined,
      deleted_at: auditLog.deleted_at
        ? toISOStringSafe(auditLog.deleted_at)
        : undefined,
    })),
  };
}

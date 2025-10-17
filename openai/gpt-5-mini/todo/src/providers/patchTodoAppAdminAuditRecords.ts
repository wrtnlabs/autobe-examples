import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAuditRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditRecord";
import { IPageITodoAppAuditRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditRecord";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminAuditRecords(props: {
  admin: AdminPayload;
  body: ITodoAppAuditRecord.IRequest;
}): Promise<IPageITodoAppAuditRecord> {
  const { admin, body } = props;

  // Authorization: ensure admin exists
  const adminRecord = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
  });
  if (adminRecord === null)
    throw new HttpException("Unauthorized: admin not found", 403);

  // Pagination defaults and caps
  const maxPageSize = 200;
  const page = Number(body.page ?? 1);
  const limit = Math.min(Number(body.pageSize ?? 20), maxPageSize);
  const skip = (page - 1) * limit;

  // Build where conditions inline
  const whereCondition = {
    ...(body.actor_role !== undefined && { actor_role: body.actor_role }),
    ...(body.action_type !== undefined && { action_type: body.action_type }),
    ...(body.target_resource !== undefined && {
      target_resource: body.target_resource,
    }),
    ...(body.target_id !== undefined &&
      body.target_id !== null && { target_id: body.target_id }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {}),
  };

  // Execute queries in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_audit_records.findMany({
      where: whereCondition,
      orderBy:
        body.sort_by === "created_at"
          ? { created_at: body.sort_order === "asc" ? "asc" : "desc" }
          : body.sort_by === "action_type"
            ? { action_type: body.sort_order === "asc" ? "asc" : "desc" }
            : body.sort_by === "actor_role"
              ? { actor_role: body.sort_order === "asc" ? "asc" : "desc" }
              : { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        admin_id: true,
        user_id: true,
        actor_role: true,
        action_type: true,
        target_resource: true,
        target_id: true,
        reason: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.todo_app_audit_records.count({ where: whereCondition }),
  ]);

  // Record the admin search as an audit event
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.todo_app_audit_records.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: admin.id,
      user_id: null,
      actor_role: "admin",
      action_type: "search_audit_records",
      target_resource: body.target_resource ?? "audit",
      target_id: body.target_id ?? null,
      reason: JSON.stringify({ filters: body }),
      created_at: now,
    },
  });

  // Map results to API DTO format
  const data = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    admin_id:
      r.admin_id === null ? null : (r.admin_id as string & tags.Format<"uuid">),
    user_id:
      r.user_id === null ? null : (r.user_id as string & tags.Format<"uuid">),
    actor_role: r.actor_role,
    action_type: r.action_type,
    target_resource: r.target_resource,
    target_id:
      r.target_id === null
        ? null
        : (r.target_id as string & tags.Format<"uuid">),
    reason: r.reason === null ? null : r.reason,
    created_at: toISOStringSafe(r.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
    data,
  };
}

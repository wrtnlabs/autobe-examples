import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";
import { IPageITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminAdminsAdminIdSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: ITodoListAdminSession.IRequest;
}): Promise<IPageITodoListAdminSession> {
  // Check that the target admin exists and is not soft-deleted
  const targetAdmin = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: props.adminId, deleted_at: null },
  });
  if (!targetAdmin) {
    throw new HttpException("Admin not found or deleted", 404);
  }
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build session filters
  const where = {
    admin_id: props.adminId,
    ...(props.body.ip ? { ip: props.body.ip } : {}),
    ...(props.body.href ? { href: props.body.href } : {}),
    ...(props.body.referrer ? { referrer: props.body.referrer } : {}),
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from && {
              gte: props.body.created_at_from,
            }),
            ...(props.body.created_at_to && { lte: props.body.created_at_to }),
          },
        }
      : {}),
    ...(props.body.expired === true ? { NOT: { expired_at: null } } : {}),
  };
  // Parallel data fetch
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_list_admin_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_admin_sessions.count({ where }),
  ]);
  // Prepare admin summary once
  const adminSummary = {
    id: targetAdmin.id,
    email: targetAdmin.email,
    locked: targetAdmin.locked,
    role: targetAdmin.role,
    created_at: toISOStringSafe(targetAdmin.created_at),
    updated_at: toISOStringSafe(targetAdmin.updated_at),
    ...(typeof targetAdmin.deleted_at !== "undefined" &&
    targetAdmin.deleted_at !== null
      ? { deleted_at: toISOStringSafe(targetAdmin.deleted_at) }
      : {}),
  };
  // Map rows to DTO
  const data = rows.map((row) => {
    const session: ITodoListAdminSession = {
      id: row.id,
      admin: adminSummary,
      ip: row.ip,
      href: row.href,
      referrer: row.referrer,
      created_at: toISOStringSafe(row.created_at),
      ...(typeof row.expired_at !== "undefined" && row.expired_at !== null
        ? { expired_at: toISOStringSafe(row.expired_at) }
        : {}),
    };
    return session;
  });
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}

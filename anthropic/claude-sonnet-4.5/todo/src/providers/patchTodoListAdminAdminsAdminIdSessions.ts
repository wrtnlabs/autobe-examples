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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminAdminsAdminIdSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: ITodoListAdminSession.IRequest;
}): Promise<IPageITodoListAdminSession.ISummary> {
  // 1. Verify that the target admin exists and is enabled
  const admin = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: {
      id: props.adminId,
      disabled_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Administrator not found or disabled.", 404);
  }

  // 2. Parse pagination and sorting parameters
  const page = props.body.page !== undefined ? props.body.page : 1;
  const limit = props.body.limit !== undefined ? props.body.limit : 100;
  const skip = (page - 1) * limit;

  // 3. Parse filter parameters
  const where: Record<string, any> = {
    todo_list_admin_id: props.adminId,
    ...(props.body.ip && { ip: { contains: props.body.ip } }),
    ...(props.body.href && { href: { contains: props.body.href } }),
    ...(props.body.referrer && { referrer: { contains: props.body.referrer } }),
    ...(props.body.created_from || props.body.created_to
      ? {
          created_at: {
            ...(props.body.created_from && { gte: props.body.created_from }),
            ...(props.body.created_to && { lte: props.body.created_to }),
          },
        }
      : {}),
    ...(props.body.expired !== undefined
      ? props.body.expired === true
        ? { expired_at: { not: null } }
        : { expired_at: null }
      : {}),
  };

  // 4. Sorting
  const validSortFields = ["created_at", "expired_at", "ip"] as const;
  const sortByRaw = props.body.sort_by;
  const sortBy: "created_at" | "expired_at" | "ip" = validSortFields.includes(
    sortByRaw as any,
  )
    ? (sortByRaw as "created_at" | "expired_at" | "ip")
    : "created_at";
  const orderBy = props.body.order_by === "asc" ? "asc" : "desc";

  // 5. Query sessions and total count in parallel
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_admin_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: orderBy,
      },
    }),
    MyGlobal.prisma.todo_list_admin_sessions.count({ where }),
  ]);

  // 6. Session summaries
  const data = sessions.map((session) => ({
    id: session.id,
    admin_id: session.todo_list_admin_id,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
  }));

  // 7. Pagination info
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data,
  };
}

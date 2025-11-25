import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // Extract pagination and filtering parameters with defaults
  const page = props.body.page !== undefined ? props.body.page : 1;
  const limit = props.body.limit !== undefined ? props.body.limit : 20;
  const skip = (page - 1) * limit;

  // Supported sort fields: "created_at" or "expired_at"
  const sortBy =
    props.body.sort_by !== undefined ? props.body.sort_by : "created_at";
  const sortOrder =
    props.body.sort_order !== undefined ? props.body.sort_order : "desc";

  // Build filtering conditions
  const where = {
    todo_list_admin_id: props.adminId,
    // Session is never deleted (optional, add if schema has deleted_at: null)
    ...(props.body.created_from && {
      created_at: { gte: props.body.created_from },
    }),
    ...(props.body.created_to && {
      created_at: {
        ...(props.body.created_from && { gte: props.body.created_from }),
        lte: props.body.created_to,
      },
    }),
    ...(props.body.expired_from && {
      expired_at: { gte: props.body.expired_from },
    }),
    ...(props.body.expired_to && {
      expired_at: {
        ...(props.body.expired_from && { gte: props.body.expired_from }),
        lte: props.body.expired_to,
      },
    }),
    ...(props.body.ip_like && {
      ip_address: { contains: props.body.ip_like },
    }),
    ...(props.body.referrer_like && {
      referrer: { contains: props.body.referrer_like },
    }),
  };

  // Handle merging of multiple conditions per field
  // For created_at and expired_at, merge gte/lte if both provided
  const createdAtFilter: Record<string, any> = {};
  if (props.body.created_from) createdAtFilter.gte = props.body.created_from;
  if (props.body.created_to) createdAtFilter.lte = props.body.created_to;
  if (Object.keys(createdAtFilter).length > 0)
    (where as any).created_at = createdAtFilter;

  const expiredAtFilter: Record<string, any> = {};
  if (props.body.expired_from) expiredAtFilter.gte = props.body.expired_from;
  if (props.body.expired_to) expiredAtFilter.lte = props.body.expired_to;
  if (Object.keys(expiredAtFilter).length > 0)
    (where as any).expired_at = expiredAtFilter;

  // Query main records and count in parallel
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_admin_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        admin: true,
      },
    }),
    MyGlobal.prisma.todo_list_admin_sessions.count({ where }),
  ]);

  // Build session summaries
  const data = sessions.map((session) => ({
    id: session.id,
    // Include direct admin summary fields (from joined session.admin)
    email: session.admin.email,
    display_name: session.admin.display_name,
    created_at: toISOStringSafe(session.admin.created_at),
    updated_at: toISOStringSafe(session.admin.updated_at),
    // All other session-level fields are present in the session object if needed
    // (But per ISummary, only account summary is required)
  }));

  // Pagination info structure
  const pagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  return { data, pagination };
}

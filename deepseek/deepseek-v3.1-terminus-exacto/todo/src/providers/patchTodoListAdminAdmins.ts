import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { IPageITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminAdmins(props: {
  admin: AdminPayload;
  body: ITodoListAdmin.IRequest;
}): Promise<IPageITodoListAdmin.ISummary> {
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 ? props.body.limit : 20;
  const skip = (page - 1) * limit;

  // Prepare WHERE filter logic
  const where: Record<string, unknown> = {
    ...(props.body.locked !== undefined ? { locked: props.body.locked } : {}),
    ...(props.body.role ? { role: props.body.role } : {}),
    ...(props.body.search
      ? {
          OR: [
            { email: { contains: props.body.search } },
            { role: { contains: props.body.search } },
          ],
        }
      : {}),
  };

  // Determine order by field (default: created_at)
  const allowedOrderBy = ["created_at", "updated_at", "email", "role"];
  const orderByField =
    props.body.order_by && allowedOrderBy.includes(props.body.order_by)
      ? props.body.order_by
      : "created_at";

  const orderDirection =
    props.body.order === "asc" || props.body.order === "desc"
      ? props.body.order
      : "desc";

  // Query admins and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_list_admins.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_admins.count({ where }),
  ]);

  // Compose summary list
  const data = rows.map((row) => ({
    id: row.id,
    email: row.email,
    locked: row.locked,
    role: row.role,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
    data,
  };
}

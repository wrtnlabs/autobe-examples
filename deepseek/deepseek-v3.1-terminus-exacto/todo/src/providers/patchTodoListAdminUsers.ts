import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminUsers(props: {
  admin: AdminPayload;
  body: ITodoListUser.IRequest;
}): Promise<IPageITodoListUser.ISummary> {
  // Extract pagination/sorting
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderByField = props.body.order_by ?? "created_at";
  const orderDirection = props.body.order_dir ?? "desc";

  // Build Prisma filters
  const where: Record<string, any> = {};
  if (props.body.email) {
    // Partial and case-insensitive search
    where.email = { contains: props.body.email, mode: "insensitive" };
  }
  if (typeof props.body.locked === "boolean") {
    where.locked = props.body.locked;
  }
  if (typeof props.body.deleted === "boolean") {
    where.deleted_at = props.body.deleted ? { not: null } : null;
  }
  if (props.body.created_from || props.body.created_to) {
    where.created_at = {};
    if (props.body.created_from) {
      where.created_at.gte = props.body.created_from;
    }
    if (props.body.created_to) {
      where.created_at.lte = props.body.created_to;
    }
  }

  // Query database
  const [users, total] = await Promise.all([
    MyGlobal.prisma.todo_list_users.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_users.count({
      where,
    }),
  ]);

  // Map to ISummary structure
  const data = users.map((user) => ({
    id: user.id,
    email: user.email,
    locked: user.locked,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}

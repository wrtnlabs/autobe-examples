import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { IPageITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserUsers(props: {
  user: UserPayload;
  body: ITodoUser.IRequest;
}): Promise<IPageITodoUser.ISummary> {
  const body = props.body || {};
  const page = body.page && body.page >= 1 ? body.page : 1;
  const limit =
    body.limit && body.limit >= 1 && body.limit <= 100 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // WHERE filter
  const where: Record<string, any> = {};
  if (body.email) {
    where.email = body.email;
  }
  if (body.created_from || body.created_to) {
    where.created_at = {};
    if (body.created_from) where.created_at.gte = body.created_from;
    if (body.created_to) where.created_at.lte = body.created_to;
  }
  if (body.updated_from || body.updated_to) {
    where.updated_at = {};
    if (body.updated_from) where.updated_at.gte = body.updated_from;
    if (body.updated_to) where.updated_at.lte = body.updated_to;
  }
  if (body.search) {
    where.email = { contains: body.search, mode: "insensitive" };
  }

  // SORTING
  let orderBy: Record<string, any>[] = [];
  if (body.sort_by) {
    orderBy = [{ [body.sort_by]: body.sort_order ?? "desc" }];
  } else {
    orderBy = [{ created_at: "desc" }];
  }

  // Get users and count in parallel
  const [users, total] = await Promise.all([
    MyGlobal.prisma.todo_users.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: { id: true },
    }),
    MyGlobal.prisma.todo_users.count({ where }),
  ]);

  return {
    data: users.map((u) => ({ id: u.id })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}

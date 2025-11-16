import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserUsers(props: {
  user: UserPayload;
  body: ITodoAppUser.IRequest;
}): Promise<IPageITodoAppUser.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;

  // Build where condition for filtering
  const where: Prisma.todo_app_usersWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      email: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...((props.body.created_at_start || props.body.created_at_end) && {
      created_at: {
        ...(props.body.created_at_start && {
          gte: props.body.created_at_start,
        }),
        ...(props.body.created_at_end && { lte: props.body.created_at_end }),
      },
    }),
    ...((props.body.updated_at_start || props.body.updated_at_end) && {
      updated_at: {
        ...(props.body.updated_at_start && {
          gte: props.body.updated_at_start,
        }),
        ...(props.body.updated_at_end && { lte: props.body.updated_at_end }),
      },
    }),
  };

  // Build orderBy for sorting
  const orderBy: Prisma.todo_app_usersOrderByWithRelationInput = {};
  if (props.body.order_by) {
    const direction = props.body.order === "desc" ? "desc" : "asc";
    orderBy[props.body.order_by] = direction;
  } else {
    orderBy.created_at = "desc";
  }

  // Execute concurrent queries for data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_users.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_app_users.count({ where }),
  ]);

  // Transform data to match API interface
  const transformedData: ITodoAppUser.ISummary[] = data.map((user) => ({
    id: user.id,
    email: user.email,
    status: user.status,
    created_at: toISOStringSafe(user.created_at),
  }));

  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { IPageITodoAppTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodouser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function patchTodoAppTodoAdminTodoUsers(props: {
  todoAdmin: TodoadminPayload;
  body: ITodoAppTodoUser.IRequest;
}): Promise<IPageITodoAppTodouser.ISummary> {
  // Authorization: props.todoAdmin is already a validated todoAdmin payload
  // according to the controller-level decorator, so no further checks here.

  const pageInput = props.body.page;
  const limitInput = props.body.limit;

  const page = pageInput !== undefined && pageInput > 0 ? pageInput : 1;
  const maxLimit = 100;
  const limit =
    limitInput !== undefined && limitInput > 0
      ? limitInput > maxLimit
        ? maxLimit
        : limitInput
      : 10;

  const skip = (page - 1) * limit;

  const whereCondition = {
    ...(props.body.email !== undefined &&
      props.body.email !== null && {
        email: props.body.email,
      }),
    ...(props.body.status !== undefined &&
      props.body.status !== null && {
        status: props.body.status,
      }),
    ...(() => {
      const createdFrom = props.body.created_from;
      const createdTo = props.body.created_to;
      if (!createdFrom && !createdTo) return {};
      return {
        created_at: {
          ...(createdFrom && { gte: createdFrom }),
          ...(createdTo && { lte: createdTo }),
        },
      };
    })(),
    ...(() => {
      const lastLoginFrom = props.body.last_login_from;
      const lastLoginTo = props.body.last_login_to;
      if (!lastLoginFrom && !lastLoginTo) return {};
      return {
        last_login_at: {
          ...(lastLoginFrom && { gte: lastLoginFrom }),
          ...(lastLoginTo && { lte: lastLoginTo }),
        },
      };
    })(),
  };

  const orderField = props.body.order_by ?? "created_at";
  const directionRaw = props.body.order_direction ?? "desc";
  const direction = directionRaw === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todousers.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: (() => {
        if (orderField === "email") return { email: direction };
        if (orderField === "last_login_at") return { last_login_at: direction };
        return { created_at: direction };
      })(),
    }),
    MyGlobal.prisma.todo_app_todousers.count({
      where: whereCondition,
    }),
  ]);

  const data = rows.map((row) => {
    return {
      id: row.id,
      email: row.email,
      display_name: row.display_name === null ? undefined : row.display_name,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
    };
  });

  const pagination: IPage.IPagination = {
    current: page - 1,
    limit: limit satisfies number as number,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}

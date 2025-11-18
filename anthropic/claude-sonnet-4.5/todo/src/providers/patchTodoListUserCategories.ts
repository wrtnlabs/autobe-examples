import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListCategory";
import { IPageITodoListCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserCategories(props: {
  user: UserPayload;
  body: ITodoListCategory.IRequest;
}): Promise<IPageITodoListCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const sortParam = props.body.sort ?? "-created_at";
  const isDescending = sortParam.startsWith("-");
  const sortField = isDescending ? sortParam.substring(1) : sortParam;
  const sortDirection: Prisma.SortOrder = isDescending ? "desc" : "asc";

  const orderBy =
    sortField === "name"
      ? { name: sortDirection }
      : { created_at: sortDirection };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_categories.findMany({
      where: {
        todo_list_user_id: props.user.id,
        ...(props.body.search && {
          name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }),
      },
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_list_categories.count({
      where: {
        todo_list_user_id: props.user.id,
        ...(props.body.search && {
          name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((category) => ({
      id: category.id,
      name: category.name,
      created_at: toISOStringSafe(category.created_at),
    })),
  };
}

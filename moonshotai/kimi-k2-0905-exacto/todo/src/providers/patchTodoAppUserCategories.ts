import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import { IPageITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserCategories(props: {
  user: UserPayload;
  body: ITodoAppCategory.IRequest;
}): Promise<IPageITodoAppCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build search condition - extract for clarity
  const whereCondition: Prisma.todo_app_categoriesWhereInput = {
    todo_app_user_id: props.user.id,
  };

  if (props.body.search) {
    whereCondition.OR = [
      {
        name: {
          contains: props.body.search,
          mode: "insensitive" as Prisma.QueryMode,
        },
      },
      {
        description: {
          contains: props.body.search,
          mode: "insensitive" as Prisma.QueryMode,
        },
      },
    ];
  }

  const [categories, totalRecords] = await Promise.all([
    MyGlobal.prisma.todo_app_categories.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
    }),
    MyGlobal.prisma.todo_app_categories.count({
      where: whereCondition,
    }),
  ]);

  const data: ITodoAppCategory.ISummary[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
  }));

  const totalPages = Math.ceil(totalRecords / limit);

  return {
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: totalPages,
    },
    data,
  };
}

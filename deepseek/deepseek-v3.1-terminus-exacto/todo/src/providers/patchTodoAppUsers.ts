import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppUserAtSummaryTransformer } from "../transformers/TodoAppUserAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUsers(props: {
  body: ITodoAppUser.IRequest;
}): Promise<IPageITodoAppUser.ISummary> {
  // Validate and set pagination parameters with proper constraints
  const page = Math.max(1, props.body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100)) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const skip = (page - 1) * limit;
  // Build WHERE clause with search and status filtering
  const whereInput = {
    ...(props.body.search &&
      props.body.search.trim() !== "" && {
        OR: [
          {
            email: {
              contains: props.body.search.trim(),
              mode: "insensitive" as const,
            },
          },
          {
            display_name: {
              contains: props.body.search.trim(),
              mode: "insensitive" as const,
            },
          },
        ],
      }),
    ...(props.body.active !== undefined &&
      props.body.active !== null && {
        deleted_at: props.body.active ? null : { not: null },
      }),
  } satisfies Prisma.todo_app_usersWhereInput;
  // Execute queries in parallel for performance
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_users.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...TodoAppUserAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.todo_app_users.count({
      where: whereInput,
    }),
  ]);
  // Transform data using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoAppUserAtSummaryTransformer.transform,
  );
  // Calculate pagination metadata
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
  };
}

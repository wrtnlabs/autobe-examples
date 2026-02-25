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
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.email && { email: props.body.email }),
    ...(props.body.display_name && {
      display_name: { contains: props.body.display_name },
    }),
  } satisfies Prisma.todo_app_usersWhereInput;
  const data = await MyGlobal.prisma.todo_app_users.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...TodoAppUserAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_users.count({
    where: whereInput,
  });
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoAppUserAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}

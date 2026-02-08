import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoUsers(props: {
  body: IMultiUserTodoUser.IRequest;
}): Promise<IPageIMultiUserTodoUser.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.multi_user_todo_users.findMany({
      where: { deleted_at: null },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        // Summary fields are unknown as DTO schema ISummary is empty, so select empty
      },
    }),
    MyGlobal.prisma.multi_user_todo_users.count({
      where: { deleted_at: null },
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map(() => ({})),
  };
}

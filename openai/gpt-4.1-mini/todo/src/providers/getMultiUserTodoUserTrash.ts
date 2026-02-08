import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoUserTrash(props: {
  user: UserPayload;
}): Promise<IPageIMultiUserTodoTodo.ISummary> {
  const { user } = props;
  // Pagination parameters with default values and boundaries
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const where = {
    multi_user_todo_user_id: user.id,
    deleted_at: { not: null },
  };
  const data = await MyGlobal.prisma.multi_user_todo_todos.findMany({
    where,
    skip,
    take: limit,
    orderBy: { deleted_at: "desc" },
  });
  const total = await MyGlobal.prisma.multi_user_todo_todos.count({ where });
  return {
    data: [], // empty summary DTO as per definition
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}

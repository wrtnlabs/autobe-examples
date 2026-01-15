import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import { IPageITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserTasks(props: {
  user: UserPayload;
  body: ITodoTask.IRequest;
}): Promise<IPageITodoTask.ISummary> {
  const page = props.body.page || 1;
  const limit = props.body.limit || 10;
  const skip = (page - 1) * limit;
  const status = props.body.status;
  const whereInput: Prisma.todo_tasksWhereInput = {
    user_id: props.user.id,
    deleted_at: null,
    ...(status && { status: { in: status } }),
  };
  const data = await MyGlobal.prisma.todo_tasks.findMany({
    where: whereInput,
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.todo_tasks.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(data, async (item) => ({
      id: item.id,
      title: item.title,
      description: undefined,
      status: item.completed ? "completed" : "pending",
      created_at: toISOStringSafe(item.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import { IPageITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchTodoListTasks(props: {
  body: ITodoListTask.IRequest;
}): Promise<IPageITodoListTask.ISummary> {
  const { dueDate, status, title } = props.body;
  const where: Prisma.todo_list_tasksWhereInput = {
    ...(dueDate && { due_date: dueDate }),
    ...(status && { status: status }),
    ...(title && { title: { contains: title, mode: "insensitive" } }),
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_tasks.findMany({
      where,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_list_tasks.count({ where }),
  ]);

  return {
    data: data.map((task) => task.title),
    pagination: {
      current: 1,
      limit: 100,
      records: total,
      pages: global.Math.ceil(total / 100),
    },
  };
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import { IPageITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserTodoListTasks(props: {
  user: UserPayload;
  body: ITodoListTask.IRequest;
}): Promise<IPageITodoListTask.ISummary> {
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 ? props.body.limit : 100;
  const skip = (page - 1) * limit;

  const whereCondition = {
    todo_list_user_id: props.user.id,
    ...(props.body.is_completed !== undefined && {
      is_completed: props.body.is_completed,
    }),
    ...(props.body.search && { title: { contains: props.body.search } }),
  };

  const orderByCondition = props.body.order_by
    ? {
        [props.body.order_by]: (props.body.order_dir === "asc"
          ? "asc"
          : "desc") satisfies "asc" | "desc" as "asc" | "desc",
      }
    : { created_at: "desc" satisfies "asc" | "desc" as "asc" | "desc" };

  const [tasks, total] = await Promise.all([
    MyGlobal.prisma.todo_list_tasks.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
      select: {
        id: true,
        title: true,
        is_completed: true,
        todo_list_user_id: true,
      },
    }),
    MyGlobal.prisma.todo_list_tasks.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      is_completed: task.is_completed,
      todo_list_user_id: task.todo_list_user_id,
    })),
  };
}

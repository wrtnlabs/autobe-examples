import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { IPageITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserTasks(props: {
  user: UserPayload;
  body: ITodoAppTask.IRequest;
}): Promise<IPageITodoAppTask.ISummary> {
  const skip = (props.body.page - 1) * props.body.limit;

  const [tasks, totalRecords] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_app_tasks.findMany({
      where: {
        todo_app_user_id: props.user.id,
        ...(props.body.status !== null &&
          props.body.status !== undefined && {
            status: props.body.status,
          }),
        ...(props.body.priority !== null &&
          props.body.priority !== undefined && {
            priority: props.body.priority,
          }),
        ...(props.body.category_id !== null &&
          props.body.category_id !== undefined && {
            todo_app_category_id: props.body.category_id,
          }),
        ...((props.body.due_date_from || props.body.due_date_to) && {
          due_date: {
            ...(props.body.due_date_from && { gte: props.body.due_date_from }),
            ...(props.body.due_date_to && { lte: props.body.due_date_to }),
          },
        }),
        ...(props.body.search && {
          OR: [
            { title: { contains: props.body.search, mode: "insensitive" } },
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }),
      },
      skip,
      take: props.body.limit,
      orderBy: {
        [props.body.sort_by || "created_at"]: props.body.sort_order || "desc",
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        due_date: true,
        completion_order: true,
      },
    }),
    MyGlobal.prisma.todo_app_tasks.count({
      where: {
        todo_app_user_id: props.user.id,
        ...(props.body.status !== null &&
          props.body.status !== undefined && {
            status: props.body.status,
          }),
        ...(props.body.priority !== null &&
          props.body.priority !== undefined && {
            priority: props.body.priority,
          }),
        ...(props.body.category_id !== null &&
          props.body.category_id !== undefined && {
            todo_app_category_id: props.body.category_id,
          }),
        ...((props.body.due_date_from || props.body.due_date_to) && {
          due_date: {
            ...(props.body.due_date_from && { gte: props.body.due_date_from }),
            ...(props.body.due_date_to && { lte: props.body.due_date_to }),
          },
        }),
        ...(props.body.search && {
          OR: [
            { title: { contains: props.body.search, mode: "insensitive" } },
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: props.body.page,
      limit: props.body.limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / props.body.limit),
    },
    data: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: typia.assert<"pending" | "in-progress" | "completed">(
        task.status,
      ),
      priority: typia.assert<"Low" | "Medium" | "High">(task.priority),
      due_date: task.due_date ? toISOStringSafe(task.due_date) : undefined,
      completion_order: task.completion_order,
    })),
  };
}

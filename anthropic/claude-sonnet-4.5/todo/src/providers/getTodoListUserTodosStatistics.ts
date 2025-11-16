import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoStatistics";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserTodosStatistics(props: {
  user: UserPayload;
}): Promise<ITodoListTodoStatistics> {
  const [totalCount, completedCount, pendingCount] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.count({
      where: {
        todo_list_user_id: props.user.id,
      },
    }),
    MyGlobal.prisma.todo_list_todos.count({
      where: {
        todo_list_user_id: props.user.id,
        completed: true,
      },
    }),
    MyGlobal.prisma.todo_list_todos.count({
      where: {
        todo_list_user_id: props.user.id,
        completed: false,
      },
    }),
  ]);

  const completionRate =
    totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  return {
    total_count: totalCount,
    completed_count: completedCount,
    pending_count: pendingCount,
    completion_rate: completionRate,
  };
}

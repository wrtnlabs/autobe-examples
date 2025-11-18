import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTaskCountStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskCountStatistics";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserDashboardUserProgress(props: {
  user: UserPayload;
}): Promise<ITodoAppTaskCountStatistics> {
  // Use a single query with conditional counting for better performance
  const [result] = await MyGlobal.prisma.$queryRaw<
    [
      {
        total_tasks: bigint;
        completed_tasks: bigint;
        pending_tasks: bigint;
      },
    ]
  >`
    SELECT 
      COUNT(*) AS total_tasks,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_tasks,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_tasks
    FROM todo_app_tasks
    WHERE todo_app_user_id = ${props.user.id}
      AND deleted_at IS NULL
  `;

  const totalTasks = Number(result.total_tasks);
  const completedTasks = Number(result.completed_tasks);
  const pendingTasks = Number(result.pending_tasks);

  // Calculate completion rate as integer percentage
  const completionRate =
    totalTasks > 0 ? Math.floor((completedTasks / totalTasks) * 100) : 0;

  return {
    total_tasks: totalTasks as number & tags.Type<"int32">,
    completed_tasks: completedTasks as number & tags.Type<"int32">,
    pending_tasks: pendingTasks as number & tags.Type<"int32">,
    completion_rate: completionRate as number &
      tags.Type<"int32"> &
      tags.Minimum<0> &
      tags.Maximum<100>,
  };
}

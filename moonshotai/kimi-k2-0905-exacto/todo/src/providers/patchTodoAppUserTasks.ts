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
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserTasks(props: {
  user: UserPayload;
  body: ITodoAppTask.IRequest;
}): Promise<IPageITodoAppTask.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where conditions with explicit typing
  const where: Record<string, unknown> = {
    todo_app_user_id: props.user.id,
    deleted_at: null,
  };

  // Status filtering
  if (props.body.status && props.body.status !== "all") {
    where.status = props.body.status === "pending" ? "pending" : "complete";
  }

  // Search filtering
  if (props.body.search && props.body.search.trim()) {
    where.OR = [
      { title: { contains: props.body.search } },
      { description: { contains: props.body.search } },
    ];
  }

  // Updated_at filtering - handle string timestamp
  if (props.body.updated_at !== undefined && props.body.updated_at !== null) {
    where.updated_at = {
      gte: props.body.updated_at,
    };
  }

  // Execute parallel queries
  const [tasks, total] = await Promise.all([
    MyGlobal.prisma.todo_app_tasks.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    }),
    MyGlobal.prisma.todo_app_tasks.count({ where }),
  ]);

  return {
    data: tasks.map((task) => ({
      id: task.id as string & tags.Format<"uuid">,
      title: task.title as string & tags.MaxLength<200>,
      status: task.status,
      user: {
        id: task.user.id as string & tags.Format<"uuid">,
        email: task.user.email as string & tags.Format<"email">,
      },
      completed_at: task.completed_at
        ? (toISOStringSafe(task.completed_at) as string &
            tags.Format<"date-time">)
        : undefined,
    })),
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}

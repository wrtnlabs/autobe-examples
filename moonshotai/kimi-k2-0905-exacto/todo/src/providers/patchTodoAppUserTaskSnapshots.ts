import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskSnapshot";
import { ITodoAppTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskStatus";
import { IPageITodoAppTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTaskSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserTaskSnapshots(props: {
  user: UserPayload;
  body: ITodoAppTaskSnapshot.IRequest;
}): Promise<IPageITodoAppTaskSnapshot.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Get user information for the response
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.user.id },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Build where conditions with proper typing
  const whereConditions: Prisma.todo_app_task_snapshotsWhereInput = {
    todo_app_user_id: props.user.id,
  };

  // Add status filter if provided
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }

  // Add title search if provided
  if (props.body.search) {
    whereConditions.title = {
      contains: props.body.search,
    };
  }

  // Add date range filtering
  if (props.body.from_date || props.body.to_date) {
    whereConditions.created_at = {};
    if (props.body.from_date) {
      whereConditions.created_at.gte = props.body.from_date;
    }
    if (props.body.to_date) {
      whereConditions.created_at.lte = props.body.to_date;
    }
  }

  // Add task-specific filtering if provided
  if (props.body.todo_app_task_id) {
    whereConditions.todo_app_task_id = props.body.todo_app_task_id;
  }

  // Build order by clause with proper typing
  let orderBy: Prisma.todo_app_task_snapshotsOrderByWithRelationInput = {};
  switch (props.body.sort_by) {
    case "createdAt":
      orderBy = { created_at: props.body.order };
      break;
    case "title":
      orderBy = { title: props.body.order };
      break;
    case "status":
      orderBy = { status: props.body.order };
      break;
    default:
      orderBy = { created_at: props.body.order };
  }

  // Execute parallel queries
  const [snapshots, total] = await Promise.all([
    MyGlobal.prisma.todo_app_task_snapshots.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            completed_at: true,
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    }),
    MyGlobal.prisma.todo_app_task_snapshots.count({
      where: whereConditions,
    }),
  ]);

  return {
    data: snapshots.map((snapshot) => ({
      id: snapshot.id,
      todo_app_task_id: snapshot.todo_app_task_id,
      todo_app_user_id: snapshot.todo_app_user_id,
      title: snapshot.title,
      description: snapshot.description ?? undefined,
      status: snapshot.status as ITodoAppTaskStatus,
      completed_at: snapshot.completed_at
        ? toISOStringSafe(snapshot.completed_at)
        : null,
      created_at: toISOStringSafe(
        snapshot.created_at,
      ) satisfies string as string,
      task: {
        id: snapshot.task.id,
        title: snapshot.task.title,
        status: snapshot.task.status,
        completed_at: snapshot.task.completed_at
          ? toISOStringSafe(snapshot.task.completed_at)
          : null,
        user: {
          id: snapshot.task.user.id,
          email: snapshot.task.user.email,
        },
      },
      user: {
        id: user.id,
        email: user.email,
      },
    })),
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}

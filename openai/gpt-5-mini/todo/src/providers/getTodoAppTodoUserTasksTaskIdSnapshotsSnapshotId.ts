import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskSnapshot";
import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function getTodoAppTodoUserTasksTaskIdSnapshotsSnapshotId(props: {
  todoUser: TodouserPayload;
  taskId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTaskSnapshot> {
  const { todoUser, taskId, snapshotId } = props;

  try {
    const snapshot = await MyGlobal.prisma.todo_app_task_snapshots.findUnique({
      where: { id: snapshotId },
      include: {
        task: {
          include: {
            list: {
              include: {
                owner: true,
              },
            },
          },
        },
        user: true,
        userSession: {
          include: {
            todouser: true,
          },
        },
      },
    });

    if (!snapshot) {
      throw new HttpException("Not Found", 404);
    }

    if (snapshot.todo_app_task_id !== taskId) {
      throw new HttpException("Not Found", 404);
    }

    if (!snapshot.task || !snapshot.task.list) {
      throw new HttpException("Not Found", 404);
    }

    const list = snapshot.task.list;

    const listOwnerId =
      (list as any).todo_app_todouser_id ??
      (list.owner && (list.owner as any).id);
    if (listOwnerId !== todoUser.id) {
      throw new HttpException(
        "Unauthorized: Only the owning user can access this snapshot",
        403,
      );
    }

    const ownerRecord = list.owner!;
    const ownerSummary = {
      id: ownerRecord.id,
      displayName: ownerRecord.display_name ?? null,
      isVerified: ownerRecord.is_verified,
      status: ownerRecord.status ?? undefined,
      createdAt: toISOStringSafe(ownerRecord.created_at),
      updatedAt: toISOStringSafe(ownerRecord.updated_at),
    };

    const listSummary = {
      id: list.id,
      title: list.title,
      visibility: list.visibility,
      owner: ownerSummary,
      description: list.description ?? null,
      createdAt: toISOStringSafe(list.created_at),
      updatedAt: toISOStringSafe(list.updated_at),
      deletedAt: list.deleted_at ? toISOStringSafe(list.deleted_at) : undefined,
    };

    const taskRecord = snapshot.task;
    const taskSummary = {
      id: taskRecord.id,
      title: taskRecord.title,
      isCompleted: taskRecord.is_completed,
      dueDate: taskRecord.due_date
        ? toISOStringSafe(taskRecord.due_date)
        : null,
      createdAt: toISOStringSafe(taskRecord.created_at),
      updatedAt: toISOStringSafe(taskRecord.updated_at),
      list: listSummary,
    };

    // Authorized access (owner) confirmed above
    const userSummary = snapshot.user
      ? {
          id: snapshot.user.id,
          displayName: snapshot.user.display_name ?? null,
          isVerified: snapshot.user.is_verified,
          status: snapshot.user.status ?? undefined,
          createdAt: toISOStringSafe(snapshot.user.created_at),
          updatedAt: toISOStringSafe(snapshot.user.updated_at),
        }
      : undefined;

    const sessionSummary = snapshot.userSession
      ? (() => {
          const sess = snapshot.userSession!;

          // Build a guaranteed non-undefined user summary for sessionSummary.user
          const sessionUserSummary = sess.todouser
            ? {
                id: sess.todouser.id,
                displayName: sess.todouser.display_name ?? null,
                isVerified: sess.todouser.is_verified,
                status: sess.todouser.status ?? undefined,
                createdAt: toISOStringSafe(sess.todouser.created_at),
                updatedAt: toISOStringSafe(sess.todouser.updated_at),
              }
            : snapshot.user
              ? {
                  id: snapshot.user.id,
                  displayName: snapshot.user.display_name ?? null,
                  isVerified: snapshot.user.is_verified,
                  status: snapshot.user.status ?? undefined,
                  createdAt: toISOStringSafe(snapshot.user.created_at),
                  updatedAt: toISOStringSafe(snapshot.user.updated_at),
                }
              : ownerSummary; // fallback to list owner summary to ensure a concrete object

          return {
            id: sess.id,
            user: sessionUserSummary,
            ip: sess.ip,
            href: sess.href ?? undefined,
            referrer: sess.referrer ?? null,
            createdAt: toISOStringSafe(sess.created_at),
            expiredAt: sess.expired_at
              ? toISOStringSafe(sess.expired_at)
              : null,
          };
        })()
      : undefined;

    const result: ITodoAppTaskSnapshot = {
      id: snapshot.id,
      todo: taskSummary,
      user: userSummary ?? undefined,
      userSession: sessionSummary ?? undefined,
      title: snapshot.title,
      description: snapshot.description ?? null,
      isCompleted: snapshot.is_completed,
      completedAt: snapshot.completed_at
        ? toISOStringSafe(snapshot.completed_at)
        : null,
      dueDate: snapshot.due_date ? toISOStringSafe(snapshot.due_date) : null,
      originalCreatedAt: snapshot.original_created_at
        ? toISOStringSafe(snapshot.original_created_at)
        : null,
      snapshotCreatedAt: toISOStringSafe(snapshot.snapshot_created_at),
      version: snapshot.version,
    };

    return result;
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}

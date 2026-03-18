import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingTaskTransformer } from "../transformers/HrmTimeTrackingTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingProjectsProjectIdTasksTaskId(props: {
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTask.IUpdate;
}): Promise<IHrmTimeTrackingTask> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: { id: true },
    });
    const task = await tx.hrm_time_tracking_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
      select: {
        id: true,
        hrm_time_tracking_project_id: true,
        parent_id: true,
        deleted_at: true,
        children: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_time_tracking_tasksFindManyArgs,
      },
    });
    if (task.deleted_at !== null) {
      throw new HttpException("Task not available for update", 404);
    }
    if (task.hrm_time_tracking_project_id !== props.projectId) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
    if (
      props.body.hrm_time_tracking_employee_id !== undefined &&
      props.body.hrm_time_tracking_employee_id !== null
    ) {
      const membership =
        await tx.hrm_time_tracking_project_memberships.findFirst({
          where: {
            hrm_time_tracking_project_id: props.projectId,
            hrm_time_tracking_employee_id:
              props.body.hrm_time_tracking_employee_id,
            deleted_at: null,
          },
          select: { id: true },
        });
      if (membership === null) {
        throw new HttpException(
          "Assignee is not a member of the same project",
          400,
        );
      }
    }
    if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
      if (props.body.parent_id === props.taskId) {
        throw new HttpException("Task cannot be its own parent", 400);
      }
      if (task.children.some((child) => child.id === props.body.parent_id)) {
        throw new HttpException(
          "Parent task selection would create a circular hierarchy",
          400,
        );
      }
      const parent = await tx.hrm_time_tracking_tasks.findUniqueOrThrow({
        where: { id: props.body.parent_id },
        select: {
          id: true,
          hrm_time_tracking_project_id: true,
          parent_id: true,
          deleted_at: true,
        },
      });
      if (parent.deleted_at !== null) {
        throw new HttpException("Parent task not available", 400);
      }
      if (parent.hrm_time_tracking_project_id !== props.projectId) {
        throw new HttpException(
          "Parent task must belong to the same project",
          400,
        );
      }
      if (parent.parent_id !== null) {
        throw new HttpException(
          "Parent task hierarchy exceeds one-level nesting",
          400,
        );
      }
    }
    await tx.hrm_time_tracking_tasks.update({
      where: { id: props.taskId },
      data: {
        ...(props.body.hrm_time_tracking_employee_id !== undefined
          ? {
              hrm_time_tracking_employee_id:
                props.body.hrm_time_tracking_employee_id,
            }
          : {}),
        ...(props.body.parent_id !== undefined
          ? { parent_id: props.body.parent_id }
          : {}),
        ...(props.body.title !== undefined ? { title: props.body.title } : {}),
        ...(props.body.description !== undefined
          ? { description: props.body.description }
          : {}),
        ...(props.body.status !== undefined
          ? { status: props.body.status }
          : {}),
        ...(props.body.priority !== undefined
          ? { priority: props.body.priority }
          : {}),
        ...(props.body.estimated_hours !== undefined
          ? { estimated_hours: props.body.estimated_hours }
          : {}),
        ...(props.body.due_date !== undefined
          ? {
              due_date:
                props.body.due_date === null
                  ? null
                  : new Date(props.body.due_date),
            }
          : {}),
        updated_at: new Date(),
      },
    });
    const updated = await tx.hrm_time_tracking_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
      ...HrmTimeTrackingTaskTransformer.select(),
    });
    return await HrmTimeTrackingTaskTransformer.transform(updated);
  });
}

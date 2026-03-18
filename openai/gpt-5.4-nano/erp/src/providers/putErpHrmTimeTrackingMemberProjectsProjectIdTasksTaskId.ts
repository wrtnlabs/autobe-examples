import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingTaskTransformer } from "../transformers/ErpHrmTimeTrackingTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeTrackingMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingTask.IUpdate;
}): Promise<IErpHrmTimeTrackingTask> {
  const project =
    await MyGlobal.prisma.erp_hrm_time_tracking_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: {
        id: true,
        erp_hrm_time_tracking_organization_id: true,
        status: true,
      },
    });
  const task =
    await MyGlobal.prisma.erp_hrm_time_tracking_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
      select: {
        id: true,
        erp_hrm_time_tracking_project_id: true,
        parent_task_id: true,
        assigned_employee_id: true,
        deleted_at: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        estimated_hours: true,
        due_date: true,
        updated_at: true,
        created_at: true,
      },
    });
  if (task.deleted_at !== null) {
    throw new HttpException("Task is deleted", 404);
  }
  if (task.erp_hrm_time_tracking_project_id !== props.projectId) {
    throw new HttpException("Invalid task target", 404);
  }
  const callerMembership =
    await MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findFirst({
      where: {
        deleted_at: null,
        project_id: props.projectId,
        employee_id: props.member.id,
      },
      select: { membership_role: true },
    });
  if (!callerMembership) {
    throw new HttpException("Forbidden", 403);
  }
  if (callerMembership.membership_role !== "project-lead") {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.parent_task_id !== undefined) {
    if (props.body.parent_task_id !== null) {
      const parent =
        await MyGlobal.prisma.erp_hrm_time_tracking_tasks.findUniqueOrThrow({
          where: { id: props.body.parent_task_id },
          select: {
            id: true,
            erp_hrm_time_tracking_project_id: true,
            parent_task_id: true,
            deleted_at: true,
          },
        });
      if (parent.deleted_at !== null) {
        throw new HttpException("Invalid parent task", 400);
      }
      if (parent.erp_hrm_time_tracking_project_id !== props.projectId) {
        throw new HttpException("Invalid parent task", 400);
      }
      if (parent.parent_task_id !== null) {
        throw new HttpException("One-level nesting only", 400);
      }
    }
  }
  if (props.body.assigned_employee_id !== undefined) {
    if (props.body.assigned_employee_id !== null) {
      const membership =
        await MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findFirst(
          {
            where: {
              deleted_at: null,
              project_id: props.projectId,
              employee_id: props.body.assigned_employee_id,
            },
            select: { id: true },
          },
        );
      if (!membership) {
        throw new HttpException(
          "Assignee must be an active project member",
          400,
        );
      }
    }
  }
  await MyGlobal.prisma.erp_hrm_time_tracking_tasks.update({
    where: { id: props.taskId },
    data: {
      updated_at: new Date(),
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.priority !== undefined && {
        priority: props.body.priority,
      }),
      ...(props.body.estimated_hours !== undefined && {
        estimated_hours: props.body.estimated_hours,
      }),
      ...(props.body.due_date !== undefined && {
        due_date:
          props.body.due_date !== null ? new Date(props.body.due_date) : null,
      }),
      ...(props.body.parent_task_id !== undefined && {
        parent_task_id: props.body.parent_task_id,
      }),
      ...(props.body.assigned_employee_id !== undefined && {
        assigned_employee_id: props.body.assigned_employee_id,
      }),
    },
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_tracking_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
      ...ErpHrmTimeTrackingTaskTransformer.select(),
    });
  return await ErpHrmTimeTrackingTaskTransformer.transform(updated);
}

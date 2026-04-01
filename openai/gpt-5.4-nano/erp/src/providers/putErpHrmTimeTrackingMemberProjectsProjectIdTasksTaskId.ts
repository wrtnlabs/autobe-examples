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
  const callerMembership =
    await MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findFirst({
      where: {
        project_id: props.projectId,
        employee_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true, membership_role: true },
    });
  if (callerMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  const canEdit = callerMembership.membership_role === "project-lead";
  if (!canEdit) {
    throw new HttpException("Forbidden", 403);
  }
  const task = await MyGlobal.prisma.erp_hrm_time_tracking_tasks.findFirst({
    where: {
      id: props.taskId,
      erp_hrm_time_tracking_project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_time_tracking_project_id: true,
      parent_task_id: true,
      assigned_employee_id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      estimated_hours: true,
      due_date: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (task === null) {
    throw new HttpException("Not Found", 404);
  }
  if (props.body.parent_task_id !== undefined) {
    if (props.body.parent_task_id !== null) {
      const parent =
        await MyGlobal.prisma.erp_hrm_time_tracking_tasks.findFirst({
          where: {
            id: props.body.parent_task_id,
            erp_hrm_time_tracking_project_id: props.projectId,
            deleted_at: null,
          },
          select: { id: true },
        });
      if (parent === null) {
        throw new HttpException("Bad Request", 400);
      }
    }
  }
  if (props.body.assigned_employee_id !== undefined) {
    if (props.body.assigned_employee_id !== null) {
      const assigneeMembership =
        await MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findFirst(
          {
            where: {
              project_id: props.projectId,
              employee_id: props.body.assigned_employee_id,
              deleted_at: null,
            },
            select: { id: true },
          },
        );
      if (assigneeMembership === null) {
        throw new HttpException("Bad Request", 400);
      }
    }
  }
  const updatedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_time_tracking_tasks.update({
      where: {
        id: props.taskId,
      },
      data: {
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
          due_date: props.body.due_date,
        }),
        ...(props.body.parent_task_id !== undefined && {
          parent_task_id: props.body.parent_task_id,
        }),
        ...(props.body.assigned_employee_id !== undefined && {
          assigned_employee_id: props.body.assigned_employee_id,
        }),
        updated_at: updatedAt,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_tracking_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
      ...ErpHrmTimeTrackingTaskTransformer.select(),
    });
  return await ErpHrmTimeTrackingTaskTransformer.transform(updated);
}

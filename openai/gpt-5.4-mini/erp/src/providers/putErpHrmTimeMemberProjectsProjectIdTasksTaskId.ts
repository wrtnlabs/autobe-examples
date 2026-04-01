import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTaskTransformer } from "../transformers/ErpHrmTimeTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTask.IUpdate;
}): Promise<IErpHrmTimeTask> {
  const projectAccess =
    await MyGlobal.prisma.erp_hrm_time_project_memberships.findFirst({
      where: {
        erp_hrm_time_project_id: props.projectId,
        erp_hrm_time_employee_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        project_role: true,
        deleted_at: true,
      },
    });
  if (projectAccess === null) throw new HttpException("Forbidden", 403);
  const task = await MyGlobal.prisma.erp_hrm_time_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      erp_hrm_time_project_id: true,
      erp_hrm_time_employee_id: true,
      parent_task_id: true,
      status: true,
    },
  });
  if (task.erp_hrm_time_project_id !== props.projectId)
    throw new HttpException("Not Found", 404);
  const canManageProject =
    projectAccess.project_role === "project-lead" ||
    projectAccess.project_role === "manager" ||
    projectAccess.project_role === "owner";
  if (!canManageProject) throw new HttpException("Forbidden", 403);
  if (props.body.employeeId !== undefined && props.body.employeeId !== null) {
    const assignee = await MyGlobal.prisma.erp_hrm_time_employees.findFirst({
      where: {
        id: props.body.employeeId,
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (assignee === null)
      throw new HttpException("Invalid task assignee", 400);
  }
  if (
    props.body.parentTaskId !== undefined &&
    props.body.parentTaskId !== null
  ) {
    const parentTask = await MyGlobal.prisma.erp_hrm_time_tasks.findUnique({
      where: { id: props.body.parentTaskId },
      select: {
        id: true,
        erp_hrm_time_project_id: true,
        parent_task_id: true,
      },
    });
    if (
      parentTask === null ||
      parentTask.erp_hrm_time_project_id !== props.projectId
    ) {
      throw new HttpException("Invalid parent task", 400);
    }
    if (parentTask.parent_task_id !== null)
      throw new HttpException("Invalid parent task nesting", 400);
    if (parentTask.id === props.taskId)
      throw new HttpException("Invalid parent task nesting", 400);
  }
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const nextStatus = props.body.status;
    const nextStatusChanged =
      nextStatus !== undefined && nextStatus !== task.status;
    await prisma.erp_hrm_time_tasks.update({
      where: { id: props.taskId },
      data: {
        ...(props.body.title !== undefined && { title: props.body.title }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.priority !== undefined && {
          priority: props.body.priority,
        }),
        ...(props.body.estimatedHours !== undefined && {
          estimated_hours: props.body.estimatedHours,
        }),
        ...(props.body.dueDate !== undefined && {
          due_date:
            props.body.dueDate === null ? null : new Date(props.body.dueDate),
        }),
        ...(props.body.employeeId !== undefined && {
          employee:
            props.body.employeeId === null
              ? { disconnect: true }
              : { connect: { id: props.body.employeeId } },
        }),
        ...(props.body.parentTaskId !== undefined && {
          parentTask:
            props.body.parentTaskId === null
              ? { disconnect: true }
              : { connect: { id: props.body.parentTaskId } },
        }),
        updated_at: new Date(),
      },
    });
    if (nextStatusChanged) {
      await prisma.erp_hrm_time_task_history_entries.create({
        data: {
          id: v4(),
          erp_hrm_time_task_id: props.taskId,
          old_status: task.status,
          new_status: nextStatus,
          changed_at: new Date(),
          erp_hrm_time_member_id: props.member.id,
        },
      });
    }
    return await prisma.erp_hrm_time_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
      ...ErpHrmTimeTaskTransformer.select(),
    });
  });
  return await ErpHrmTimeTaskTransformer.transform(updated);
}

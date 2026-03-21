import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTaskTransformer } from "../transformers/ErpHrmTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IErpHrmTask.IUpdate;
}): Promise<IErpHrmTask> {
  // 1. Get the project to find organization
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, organization_id: true },
  });
  // 2. Get employee record for this member in this organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: project.organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      role: {
        select: {
          permissions: {
            select: { permission: true },
          },
        },
      },
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found in this organization", 403);
  }
  // 3. Check authorization - project lead or project:manage permission
  const projectMember = await MyGlobal.prisma.erp_hrm_project_members.findFirst(
    {
      where: {
        erp_hrm_employee_id: employee.id,
        erp_hrm_project_id: props.projectId,
        deleted_at: null,
      },
      select: { role: true },
    },
  );
  const isProjectLead = projectMember?.role === "project_lead";
  const hasManagePermission = employee.role.permissions.some(
    (p) => p.permission === "project:manage",
  );
  if (!isProjectLead && !hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Get the existing task
  const existingTask = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
    where: {
      id: props.taskId,
      project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });
  if (!existingTask) {
    throw new HttpException("Task not found", 404);
  }
  // 5. Validate title uniqueness if title is being updated
  if (props.body.title !== undefined) {
    const duplicateTask = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        project_id: props.projectId,
        title: props.body.title,
        id: { not: props.taskId },
        deleted_at: null,
      },
    });
    if (duplicateTask) {
      throw new HttpException("Task title already exists in this project", 409);
    }
  }
  // 6. Validate employee assignment if employeeId is provided
  if (props.body.employeeId !== undefined && props.body.employeeId !== null) {
    const employeeMember =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_employee_id: props.body.employeeId,
          erp_hrm_project_id: props.projectId,
          deleted_at: null,
        },
      });
    if (!employeeMember) {
      throw new HttpException(
        "Assigned employee must be a project member",
        400,
      );
    }
  }
  // 7. Update task record
  await MyGlobal.prisma.erp_hrm_tasks.update({
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
        due_date: props.body.dueDate ? new Date(props.body.dueDate) : null,
      }),
      ...(props.body.employeeId !== undefined && {
        employee: props.body.employeeId
          ? { connect: { id: props.body.employeeId } }
          : { disconnect: true },
      }),
      updated_at: new Date(),
    },
  });
  // 8. Record status change in history if status changed
  if (
    props.body.status !== undefined &&
    props.body.status !== existingTask.status
  ) {
    await MyGlobal.prisma.erp_hrm_task_histories.create({
      data: {
        id: v4(),
        task_id: props.taskId,
        previous_status: existingTask.status,
        new_status: props.body.status,
        member_id: props.member.id,
        created_at: new Date(),
      },
    });
  }
  // 9. Return updated task using transformer
  const updatedTask = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    ...ErpHrmTaskTransformer.select(),
  });
  return ErpHrmTaskTransformer.transform(updatedTask);
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
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
  // 1. Get the requesting member's employee record and organization context
  const memberEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
    },
  });
  if (!memberEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify the task exists and belongs to the specified project
  const existingTask = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
    where: { id: props.taskId },
    select: {
      id: true,
      erp_hrm_project_id: true,
      status: true,
    },
  });
  if (!existingTask || existingTask.erp_hrm_project_id !== props.projectId) {
    throw new HttpException(
      "Task not found or does not belong to this project",
      404,
    );
  }
  // 3. Check if project belongs to employee's organization
  const project = await MyGlobal.prisma.erp_hrm_projects.findUnique({
    where: { id: props.projectId },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (
    !project ||
    project.erp_hrm_organization_id !== memberEmployee.erp_hrm_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Authorization check: project:manage OR project-lead on this project
  const hasProjectManagePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: memberEmployee.erp_hrm_role_id,
        permission: "project:manage",
      },
    });
  let isProjectLead = false;
  if (!hasProjectManagePermission) {
    const projectMembership =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_employee_id: memberEmployee.id,
          erp_hrm_project_id: props.projectId,
          assigned_role: "project_lead",
        },
      });
    isProjectLead = !!projectMembership;
  }
  if (!hasProjectManagePermission && !isProjectLead) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. If erp_hrm_employee_id is being changed, verify the employee is a project member
  if (
    props.body.erp_hrm_employee_id !== undefined &&
    props.body.erp_hrm_employee_id !== null
  ) {
    const newEmployeeProjectMembership =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_employee_id: props.body.erp_hrm_employee_id,
          erp_hrm_project_id: props.projectId,
        },
      });
    if (!newEmployeeProjectMembership) {
      throw new HttpException(
        "Only project members can be assigned to tasks",
        400,
      );
    }
  }
  // 6. Build update data
  const updateData: Prisma.erp_hrm_tasksUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority;
  }
  if (props.body.estimated_hours !== undefined) {
    updateData.estimated_hours = props.body.estimated_hours;
  }
  if (props.body.due_date !== undefined) {
    updateData.due_date = props.body.due_date
      ? new Date(props.body.due_date)
      : null;
  }
  if (props.body.erp_hrm_employee_id !== undefined) {
    updateData.assignee = props.body.erp_hrm_employee_id
      ? { connect: { id: props.body.erp_hrm_employee_id } }
      : { disconnect: true };
  }
  const statusChanged =
    props.body.status !== undefined &&
    props.body.status !== existingTask.status;
  // 7. Update the task
  await MyGlobal.prisma.erp_hrm_tasks.update({
    where: { id: props.taskId },
    data: updateData,
  });
  // 8. If status changed by project-lead (not org-level admin), create task history
  if (statusChanged && isProjectLead) {
    await MyGlobal.prisma.erp_hrm_task_histories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        erp_hrm_task_id: props.taskId,
        erp_hrm_member_id: props.member.id,
        previous_status: existingTask.status,
        new_status: props.body.status!,
        created_at: new Date(),
      },
    });
  }
  // 9. Fetch and return the complete updated task
  const updatedTask = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    ...ErpHrmTaskTransformer.select(),
  });
  return await ErpHrmTaskTransformer.transform(updatedTask);
}

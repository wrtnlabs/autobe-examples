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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmTaskTransformer } from "../transformers/ErpHrmTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmAdminProjectsProjectIdTasksTaskId(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IErpHrmTask.IUpdate;
}): Promise<IErpHrmTask> {
  // Get project to find organization
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  // Verify task exists and belongs to the project
  const existingTask = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      erp_hrm_project_id: true,
      erp_hrm_employee_id: true,
      status: true,
    },
  });
  // Ensure task belongs to specified project
  if (existingTask.erp_hrm_project_id !== props.projectId) {
    throw new HttpException(
      "Task does not belong to the specified project",
      404,
    );
  }
  // Get admin details
  const admin = await MyGlobal.prisma.erp_hrm_admins.findUniqueOrThrow({
    where: { id: props.admin.id },
    select: {
      id: true,
      email: true,
    },
  });
  // Find member by email (admins may have corresponding member accounts)
  let adminMemberId: string | null = null;
  const member = await MyGlobal.prisma.erp_hrm_members.findUnique({
    where: { email: admin.email },
    select: { id: true },
  });
  if (member) {
    adminMemberId = member.id;
  }
  // Find admin's employee in the organization (if member exists)
  let adminEmployee: {
    id: string;
    erp_hrm_role_id: string;
    erp_hrm_member_id: string;
  } | null = null;
  if (adminMemberId) {
    adminEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
      where: {
        erp_hrm_member_id: adminMemberId,
        erp_hrm_organization_id: project.erp_hrm_organization_id,
      },
      select: {
        id: true,
        erp_hrm_role_id: true,
        erp_hrm_member_id: true,
      },
    });
  }
  // Authorization: Check project:manage permission OR project-lead role on this project
  let hasProjectManagePermission = false;
  let isProjectLead = false;
  if (adminEmployee) {
    // Check if employee has project:manage permission
    const rolePermissions =
      await MyGlobal.prisma.erp_hrm_role_permissions.findMany({
        where: { erp_hrm_role_id: adminEmployee.erp_hrm_role_id },
        select: { permission: true },
      });
    hasProjectManagePermission = rolePermissions.some(
      (p) => p.permission === "project:manage",
    );
    // If not org-level admin, check project-lead status
    if (!hasProjectManagePermission) {
      const projectMembership =
        await MyGlobal.prisma.erp_hrm_project_members.findFirst({
          where: {
            erp_hrm_employee_id: adminEmployee.id,
            erp_hrm_project_id: props.projectId,
            assigned_role: "project_lead",
          },
        });
      isProjectLead = !!projectMembership;
    }
  }
  if (!hasProjectManagePermission && !isProjectLead) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate employee assignment if being changed
  if (
    props.body.erp_hrm_employee_id !== undefined &&
    props.body.erp_hrm_employee_id !== null
  ) {
    // Verify the new employee is a member of the project
    const projectMembership =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_project_id: props.projectId,
          erp_hrm_employee_id: props.body.erp_hrm_employee_id,
        },
      });
    if (!projectMembership) {
      throw new HttpException(
        "Cannot assign employee to task: employee is not a member of this project",
        400,
      );
    }
  }
  // Track if status is being changed (needed for task history)
  const isStatusChanged =
    props.body.status !== undefined &&
    props.body.status !== existingTask.status;
  const previousStatus = existingTask.status;
  // Build update data
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
  // Update the task
  await MyGlobal.prisma.erp_hrm_tasks.update({
    where: { id: props.taskId },
    data: updateData,
  });
  // Create task history entry if status changed by project-lead
  if (isStatusChanged && isProjectLead && adminMemberId) {
    await MyGlobal.prisma.erp_hrm_task_histories.create({
      data: {
        id: v4(),
        erp_hrm_task_id: props.taskId,
        previous_status: previousStatus,
        new_status: props.body.status!,
        erp_hrm_member_id: adminMemberId,
        created_at: new Date(),
      },
    });
  }
  // Return updated task using Transformer
  const updatedTask = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    ...ErpHrmTaskTransformer.select(),
  });
  return await ErpHrmTaskTransformer.transform(updatedTask);
}

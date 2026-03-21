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
import { ErpHrmTaskCollector } from "../collectors/ErpHrmTaskCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTaskTransformer } from "../transformers/ErpHrmTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTask.ICreate;
}): Promise<IErpHrmTask> {
  // 1. Get project and verify it exists
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, organization_id: true, deleted_at: true },
  });
  if (project.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  // 2. Get employee record for this member in the project's organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: project.organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found in organization", 403);
  }
  // 3. Check authorization: project-lead OR project:manage permission
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        erp_hrm_employee_id: employee.id,
        erp_hrm_project_id: props.projectId,
        deleted_at: null,
      },
      select: { role: true },
    });
  const isProjectLead = projectMembership?.role === "project_lead";
  let hasProjectManagePermission = false;
  if (!isProjectLead) {
    const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst(
      {
        where: {
          erp_hrm_role_id: employee.erp_hrm_role_id,
          permission: "project:manage",
        },
      },
    );
    hasProjectManagePermission = permission !== null;
  }
  if (!isProjectLead && !hasProjectManagePermission) {
    throw new HttpException(
      "Forbidden - requires project-lead role or project:manage permission",
      403,
    );
  }
  // 4. Validate employee_id if provided (must be project member)
  if (props.body.employee_id !== undefined && props.body.employee_id !== null) {
    const assigneeMembership =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_employee_id: props.body.employee_id,
          erp_hrm_project_id: props.projectId,
          deleted_at: null,
        },
      });
    if (assigneeMembership === null) {
      throw new HttpException(
        "Assigned employee must be a project member",
        403,
      );
    }
  }
  // 5. Validate parent_task_id if provided
  if (
    props.body.parent_task_id !== undefined &&
    props.body.parent_task_id !== null
  ) {
    const parentTask = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
      where: { id: props.body.parent_task_id },
      select: { project_id: true, parent_task_id: true },
    });
    if (parentTask === null || parentTask.project_id !== props.projectId) {
      throw new HttpException(
        "Parent task must belong to the same project",
        400,
      );
    }
    if (parentTask.parent_task_id !== null) {
      throw new HttpException("Parent task cannot itself be a subtask", 400);
    }
  }
  // 6. Create task using collector
  const taskData = await ErpHrmTaskCollector.collect({
    body: props.body,
    erpHrmProjects: { id: props.projectId },
  });
  const createdTask = await MyGlobal.prisma.erp_hrm_tasks.create({
    data: taskData,
    ...ErpHrmTaskTransformer.select(),
  });
  // 7. Create task history entry
  await MyGlobal.prisma.erp_hrm_task_histories.create({
    data: {
      id: v4(),
      task_id: createdTask.id,
      member_id: props.member.id,
      previous_status: "open",
      new_status: createdTask.status,
      created_at: new Date(),
    },
  });
  // 8. Return transformed task
  return await ErpHrmTaskTransformer.transform(createdTask);
}

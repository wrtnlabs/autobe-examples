import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTaskCollector } from "../collectors/HrmTaskCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTaskTransformer } from "../transformers/HrmTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmMemberOrganizationsOrganizationIdProjectsProjectIdTasks(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  projectId: string & tags.Format<"uuid">;
  body: IHrmTask.ICreate;
}): Promise<IHrmTask> {
  // Validate project exists, belongs to organization, and status is 'active'
  const project = await MyGlobal.prisma.hrm_projects.findUnique({
    where: { id: props.projectId },
    select: { id: true, organization: true, status: true },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  if (project.organization.id !== props.organizationId) {
    throw new HttpException("Project does not belong to organization", 404);
  }
  if (project.status !== "active") {
    throw new HttpException("Project is not active", 400);
  }
  // Validate user has permission (project-lead role or project:manage permission)
  const projectMember = await MyGlobal.prisma.hrm_project_members.findFirst({
    where: {
      project_id: props.projectId,
      employee: {
        user_id: props.member.id,
      },
    },
    select: { role: true },
  });
  if (projectMember === null) {
    throw new HttpException("You are not a member of this project", 403);
  }
  let hasPermission = projectMember.role === "project-lead";
  if (!hasPermission) {
    // Check for project:manage permission at organization level
    const employee = await MyGlobal.prisma.hrm_employees.findFirst({
      where: {
        user_id: props.member.id,
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: { role_id: true },
    });
    if (employee !== null) {
      const rolePermissions =
        await MyGlobal.prisma.hrm_role_permissions.findMany({
          where: { hrm_role_id: employee.role_id },
          select: { hrm_permission_id: true },
        });
      const permissionIds = rolePermissions.map((rp) => rp.hrm_permission_id);
      const managePermission = await MyGlobal.prisma.hrm_permissions.findFirst({
        where: {
          id: { in: permissionIds },
          permission_name: "project:manage",
        },
      });
      hasPermission = managePermission !== null;
    }
  }
  if (!hasPermission) {
    throw new HttpException("You do not have permission to create tasks", 403);
  }
  // Validate assigned_employee_id if provided
  if (
    props.body.assigned_employee_id !== undefined &&
    props.body.assigned_employee_id !== null
  ) {
    const assignedEmployee = await MyGlobal.prisma.hrm_employees.findFirst({
      where: {
        id: props.body.assigned_employee_id,
        organization_id: props.organizationId,
        deleted_at: null,
      },
    });
    if (assignedEmployee === null) {
      throw new HttpException("Assigned employee not found", 400);
    }
    const isProjectMember = await MyGlobal.prisma.hrm_project_members.findFirst(
      {
        where: {
          project_id: props.projectId,
          employee_id: props.body.assigned_employee_id,
        },
      },
    );
    if (isProjectMember === null) {
      throw new HttpException(
        "Assigned employee is not a member of this project",
        400,
      );
    }
  }
  // Validate parent_task_id if provided
  if (
    props.body.parent_task_id !== undefined &&
    props.body.parent_task_id !== null
  ) {
    const parentTask = await MyGlobal.prisma.hrm_tasks.findFirst({
      where: {
        id: props.body.parent_task_id,
        project_id: props.projectId,
        deleted_at: null,
      },
    });
    if (parentTask === null) {
      throw new HttpException(
        "Parent task not found or does not belong to this project",
        400,
      );
    }
  }
  // Validate title is non-empty
  if (props.body.title.trim().length === 0) {
    throw new HttpException("Title cannot be empty", 400);
  }
  // Validate priority is one of the allowed values
  const validPriorities = ["low", "medium", "high", "urgent"];
  if (!validPriorities.includes(props.body.priority)) {
    throw new HttpException("Invalid priority value", 400);
  }
  // Create the task using collector
  const task = await MyGlobal.prisma.hrm_tasks.create({
    data: await HrmTaskCollector.collect({
      body: props.body,
      project: { id: props.projectId },
    }),
    ...HrmTaskTransformer.select(),
  });
  return await HrmTaskTransformer.transform(task);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// import { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmMemberOrganizationsOrganizationIdProjectsProjectIdTasks(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   projectId: string & tags.Format<"uuid">;
//   body: IHrmTask.ICreate;
// }): Promise<IHrmTask> {
//   const record = await MyGlobal.prisma.hrm_tasks.create({
//     data: await HrmTaskCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmTaskTransformer.select(),
//   });
//   return await HrmTaskTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
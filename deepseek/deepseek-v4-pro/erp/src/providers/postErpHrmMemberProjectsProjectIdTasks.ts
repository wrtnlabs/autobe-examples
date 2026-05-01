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
  // 1. Validate project exists, is active, and not deleted
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, status: true, deleted_at: true, organization_id: true },
  });
  if (project.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  if (project.status !== "active") {
    throw new HttpException(
      "Cannot create tasks in a project that is not active",
      400,
    );
  }
  // 2. Find the employee record for this member in the project's organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: project.organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (employee === null) {
    throw new HttpException("Employee not found in this organization", 403);
  }
  // 3. Authorization: must be project-lead on this project
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        erp_hrm_employee_id: employee.id,
        erp_hrm_project_id: props.projectId,
        role: "project-lead",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (projectMembership === null) {
    throw new HttpException(
      "Only project leads can create tasks in this project",
      403,
    );
  }
  // 4. Validate assigned employee (if provided)
  if (props.body.assigned_employee_id !== undefined) {
    const assignee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
      where: { id: props.body.assigned_employee_id },
      select: { id: true, deleted_at: true, erp_hrm_organization_id: true },
    });
    if (assignee.deleted_at !== null) {
      throw new HttpException("Assigned employee not found", 404);
    }
    if (assignee.erp_hrm_organization_id !== project.organization_id) {
      throw new HttpException(
        "Assigned employee does not belong to this organization",
        400,
      );
    }
    const assigneeMembership =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_employee_id: props.body.assigned_employee_id,
          erp_hrm_project_id: props.projectId,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (assigneeMembership === null) {
      throw new HttpException(
        "Assigned employee is not an active member of this project",
        400,
      );
    }
  }
  // 5. Validate parent task (if provided)
  if (props.body.parent_task_id !== undefined) {
    const parentTask = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
      where: { id: props.body.parent_task_id },
      select: {
        id: true,
        erp_hrm_project_id: true,
        erp_hrm_parent_task_id: true,
        deleted_at: true,
      },
    });
    if (parentTask.deleted_at !== null) {
      throw new HttpException("Parent task not found", 404);
    }
    if (parentTask.erp_hrm_project_id !== props.projectId) {
      throw new HttpException(
        "Parent task must belong to the same project",
        400,
      );
    }
    if (parentTask.erp_hrm_parent_task_id !== null) {
      throw new HttpException(
        "Parent task is already a subtask. Maximum nesting depth is one level.",
        400,
      );
    }
  }
  // 6. Create task using Collector
  const record = await MyGlobal.prisma.erp_hrm_tasks.create({
    data: await ErpHrmTaskCollector.collect({
      body: props.body,
      erpHrmProjects: { id: props.projectId },
    }),
    ...ErpHrmTaskTransformer.select(),
  });
  // 7. Record task creation in history
  // The history entry records the initial status as both old and new status
  // since the DB column is non-nullable and this represents creation (no prior state)
  await MyGlobal.prisma.erp_hrm_task_histories.create({
    data: {
      id: v4(),
      task: { connect: { id: record.id } },
      changedByMember: { connect: { id: props.member.id } },
      old_status: record.status,
      new_status: record.status,
      created_at: new Date(),
    },
  });
  // 8. Transform and return
  return await ErpHrmTaskTransformer.transform(record);
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
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberProjectsProjectIdTasks(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IErpHrmTask.ICreate;
// }): Promise<IErpHrmTask> {
//   const record = await MyGlobal.prisma.erp_hrm_tasks.create({
//     data: await ErpHrmTaskCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmTaskTransformer.select(),
//   });
//   return await ErpHrmTaskTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
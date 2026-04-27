import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify project exists and is active (not soft-deleted)
  const project = await MyGlobal.prisma.hrm_time_tracking_projects.findFirst({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_organization_id: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // 2. Find the employee record for the authenticated member in the project's organization
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_organization_id:
        project.hrm_time_tracking_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Find the task — verify it exists, belongs to the project, and is not soft-deleted
  const task = await MyGlobal.prisma.hrm_time_tracking_tasks.findFirst({
    where: {
      id: props.taskId,
      hrm_time_tracking_project_id: props.projectId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (task === null) {
    throw new HttpException("Task not found", 404);
  }
  // 4. Authorization: employee must have project:manage permission OR be a project-lead
  const hasProjectManagePermission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "project:manage",
        deleted_at: null,
      },
      select: { id: true },
    });
  let authorized = hasProjectManagePermission !== null;
  if (!authorized) {
    const isProjectLead =
      await MyGlobal.prisma.hrm_time_tracking_project_members.findFirst({
        where: {
          hrm_time_tracking_project_id: props.projectId,
          hrm_time_tracking_employee_id: employee.id,
          role: "project-lead",
          deleted_at: null,
        },
        select: { id: true },
      });
    authorized = isProjectLead !== null;
  }
  if (!authorized) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Atomic transaction: promote subtasks + soft-delete the task
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 5a. Clear parent_task_id on any subtasks, promoting them to top-level tasks
    await tx.hrm_time_tracking_tasks.updateMany({
      where: { parent_task_id: props.taskId },
      data: {
        parent_task_id: null,
        updated_at: new Date().toISOString(),
      },
    });
    // 5b. Soft-delete the task itself
    await tx.hrm_time_tracking_tasks.update({
      where: { id: props.taskId },
      data: {
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteHrmTimeTrackingMemberProjectsProjectIdTasksTaskId(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   taskId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
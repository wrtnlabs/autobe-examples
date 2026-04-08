import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmAdminProjectsProjectIdTasksTaskId(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify project exists and belongs to current organization
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  // 2. Verify task exists and belongs to the specified project
  const task = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      erp_hrm_project_id: props.projectId,
    },
    select: {
      id: true,
      erp_hrm_project_id: true,
    },
  });
  // 3. Check authorization: user has project:manage permission OR is project lead
  // First check if user has project:manage permission in the organization
  const hasProjectManagePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        permission: "project:manage",
        role: {
          erp_hrm_organization_id: project.erp_hrm_organization_id,
        },
      },
      select: {
        id: true,
      },
    });
  let isProjectLead = false;
  if (!hasProjectManagePermission) {
    // Check if user is a project lead on this specific project
    // Note: We need to find the employee record for this admin to check project membership
    const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
      where: {
        erp_hrm_member_id: props.admin.id,
        erp_hrm_organization_id: project.erp_hrm_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (employee) {
      const projectMember =
        await MyGlobal.prisma.erp_hrm_project_members.findFirst({
          where: {
            erp_hrm_employee_id: employee.id,
            erp_hrm_project_id: task.erp_hrm_project_id,
            assigned_role: "project_lead",
          },
          select: {
            id: true,
          },
        });
      isProjectLead = projectMember !== null;
    }
  }
  // If neither condition is met, deny access
  if (!hasProjectManagePermission && !isProjectLead) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Delete the task (cascade deletes erp_hrm_task_histories automatically)
  await MyGlobal.prisma.erp_hrm_tasks.delete({
    where: { id: props.taskId },
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
// export async function deleteErpHrmAdminProjectsProjectIdTasksTaskId(props: {
//   admin: AdminPayload;
//   projectId: string & tags.Format<"uuid">;
//   taskId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
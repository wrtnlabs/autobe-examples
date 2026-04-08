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

export async function deleteHrmMemberOrganizationsOrganizationIdProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  const deletedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  // Validate task exists and get its project_id
  const task = await MyGlobal.prisma.hrm_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: { id: true, project_id: true },
  });
  // Validate project belongs to the specified organization
  const project = await MyGlobal.prisma.hrm_projects.findUniqueOrThrow({
    where: { id: task.project_id },
    select: { id: true, hrm_organization_id: true },
  });
  // Verify organization matches
  if (project.hrm_organization_id !== props.organizationId) {
    throw new HttpException("Not Found", 404);
  }
  // Verify project matches the path parameter
  if (project.id !== props.projectId) {
    throw new HttpException("Not Found", 404);
  }
  // Check user has project-lead role (project:manage permission)
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  const membership = await MyGlobal.prisma.hrm_project_members.findFirst({
    where: {
      project_id: props.projectId,
      employee_id: employee.id,
      deleted_at: null,
    },
  });
  if (!membership || membership.role !== "project-lead") {
    throw new HttpException("Forbidden", 403);
  }
  // Helper function to recursively soft delete child tasks
  async function cascadeSoftDeleteChildren(
    parentTaskId: string,
    deletedAt: string,
  ): Promise<void> {
    // Find all direct children that are not already deleted
    const children = await MyGlobal.prisma.hrm_tasks.findMany({
      where: {
        parent_task_id: parentTaskId,
        deleted_at: null,
      },
    });
    // Recursively delete each child's descendants first, then delete the child
    for (const child of children) {
      await cascadeSoftDeleteChildren(child.id, deletedAt);
      await MyGlobal.prisma.hrm_tasks.update({
        where: { id: child.id },
        data: { deleted_at: deletedAt },
      });
    }
  }
  // Cascade soft delete to all child tasks recursively
  await cascadeSoftDeleteChildren(props.taskId, deletedAt);
  // Soft delete the task
  await MyGlobal.prisma.hrm_tasks.update({
    where: { id: props.taskId },
    data: { deleted_at: deletedAt },
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
// export async function deleteHrmMemberOrganizationsOrganizationIdProjectsProjectIdTasksTaskId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   projectId: string & tags.Format<"uuid">;
//   taskId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
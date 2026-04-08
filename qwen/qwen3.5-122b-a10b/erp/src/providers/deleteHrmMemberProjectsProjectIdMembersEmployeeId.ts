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

export async function deleteHrmMemberProjectsProjectIdMembersEmployeeId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  employeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify project exists and get its organization
  const project = await MyGlobal.prisma.hrm_projects.findUnique({
    where: { id: props.projectId, deleted_at: null },
    select: { id: true, hrm_organization_id: true },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // 2. Verify employee exists and belongs to the same organization
  const employee = await MyGlobal.prisma.hrm_employees.findUnique({
    where: { id: props.employeeId, deleted_at: null },
    select: { id: true, organization_id: true, user_id: true },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  if (employee.organization_id !== project.hrm_organization_id) {
    throw new HttpException(
      "Employee does not belong to the project's organization",
      403,
    );
  }
  // 3. Verify membership record exists and is not already deleted
  const membership = await MyGlobal.prisma.hrm_project_members.findUnique({
    where: {
      project_id_employee_id: {
        project_id: props.projectId,
        employee_id: props.employeeId,
      },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (membership === null) {
    throw new HttpException("Project membership not found", 404);
  }
  // 4. Check user has project:manage permission
  // Get the member's employee record in the organization
  const memberEmployee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: project.hrm_organization_id,
      deleted_at: null,
    },
    select: { role_id: true },
  });
  if (memberEmployee === null) {
    throw new HttpException("Member is not part of the organization", 403);
  }
  // Check if the role has project:manage permission
  const permissionIds = await MyGlobal.prisma.hrm_role_permissions
    .findMany({
      where: { hrm_role_id: memberEmployee.role_id },
      select: { hrm_permission_id: true },
    })
    .then((rows) => rows.map((r) => r.hrm_permission_id));
  const hasProjectManagePermission =
    await MyGlobal.prisma.hrm_permissions.findFirst({
      where: {
        id: { in: permissionIds },
        permission_name: "project:manage",
      },
    });
  if (hasProjectManagePermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Soft delete the membership record
  await MyGlobal.prisma.hrm_project_members.update({
    where: { id: membership.id },
    data: { deleted_at: new Date() },
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
// export async function deleteHrmMemberProjectsProjectIdMembersEmployeeId(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   employeeId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
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

export async function deleteErpHrmMemberProjectsProjectIdMembersEmployeeId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  employeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization selected", 400);
  }
  const organizationId: string = session.erp_hrm_organization_id;
  const memberEmployee =
    await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
      where: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: organizationId,
        deleted_at: null,
      },
      select: {
        role: {
          select: {
            name: true,
            is_builtin: true,
            rolePermissions: {
              select: {
                permission: { select: { key: true } },
              },
            },
          },
        },
      },
    });
  const hasProjectManage: boolean = memberEmployee.role.is_builtin
    ? memberEmployee.role.name === "Owner" ||
      memberEmployee.role.name === "Manager"
    : memberEmployee.role.rolePermissions.some(
        (rp) => rp.permission.key === "project:manage",
      );
  if (!hasProjectManage) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      organization_id: organizationId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const membership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirstOrThrow({
      where: {
        erp_hrm_employee_id: props.employeeId,
        erp_hrm_project_id: props.projectId,
        deleted_at: null,
      },
      select: { id: true },
    });
  const now: string = new Date().toISOString();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_project_members.update({
      where: { id: membership.id },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.erp_hrm_tasks.updateMany({
      where: {
        erp_hrm_project_id: props.projectId,
        erp_hrm_assigned_employee_id: props.employeeId,
      },
      data: {
        erp_hrm_assigned_employee_id: null,
        updated_at: now,
      },
    }),
  ]);
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
// export async function deleteErpHrmMemberProjectsProjectIdMembersEmployeeId(props: {
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
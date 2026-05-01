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

export async function deleteErpHrmMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  const organizationId: string | null = session.erp_hrm_organization_id;
  if (!organizationId) {
    throw new HttpException("No organization context selected", 400);
  }
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: organizationId,
      status: "active",
      deleted_at: null,
    },
    select: {
      id: true,
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
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  const hasOrgManage: boolean =
    (employee.role.is_builtin && employee.role.name === "Owner") ||
    employee.role.rolePermissions.some(
      (rp) => rp.permission.key === "org:manage",
    );
  if (!hasOrgManage) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const department = await tx.erp_hrm_departments.findFirst({
      where: {
        id: props.departmentId,
        erp_hrm_organization_id: organizationId,
        deleted_at: null,
      },
      select: { id: true, name: true },
    });
    if (!department) {
      throw new HttpException("Department not found", 404);
    }
    const childCount: number = await tx.erp_hrm_departments.count({
      where: {
        parent_id: props.departmentId,
        deleted_at: null,
        erp_hrm_organization_id: organizationId,
      },
    });
    if (childCount > 0) {
      throw new HttpException(
        "Child departments must be reassigned or deleted first",
        409,
      );
    }
    const affected = await tx.erp_hrm_employees.updateMany({
      where: {
        erp_hrm_department_id: props.departmentId,
        erp_hrm_organization_id: organizationId,
      },
      data: {
        erp_hrm_department_id: null,
        updated_at: new Date().toISOString(),
      },
    });
    const now: string = new Date().toISOString();
    await tx.erp_hrm_departments.update({
      where: { id: props.departmentId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
    await tx.erp_hrm_activity_logs.create({
      data: {
        id: v4(),
        user_id: props.member.id,
        organization_id: organizationId,
        action_type: "department.deleted",
        target_entity: "department",
        target_id: props.departmentId,
        details: JSON.stringify({
          department_name: department.name,
          affected_employees: affected.count,
        }),
        created_at: now,
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
// export async function deleteErpHrmMemberDepartmentsDepartmentId(props: {
//   member: MemberPayload;
//   departmentId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
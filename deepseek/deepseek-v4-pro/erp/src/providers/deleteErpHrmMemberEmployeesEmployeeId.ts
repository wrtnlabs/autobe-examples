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

export async function deleteErpHrmMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const targetEmployee =
    await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
      where: { id: props.employeeId, deleted_at: null },
      select: {
        id: true,
        erp_hrm_organization_id: true,
        role: { select: { name: true, is_builtin: true } },
      },
    });
  const memberEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: targetEmployee.erp_hrm_organization_id,
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
  if (memberEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  const role = memberEmployee.role;
  const hasPermission: boolean = role.is_builtin
    ? role.name === "Owner" || role.name === "Manager"
    : role.rolePermissions.some(
        (rp) => rp.permission.key === "employee:manage",
      );
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  if (targetEmployee.role.name === "Owner") {
    const otherOwnersCount = await MyGlobal.prisma.erp_hrm_employees.count({
      where: {
        erp_hrm_organization_id: targetEmployee.erp_hrm_organization_id,
        deleted_at: null,
        id: { not: targetEmployee.id },
        role: { name: "Owner", is_builtin: true },
      },
    });
    if (otherOwnersCount === 0) {
      throw new HttpException(
        "Cannot erase the sole owner. Transfer ownership first.",
        409,
      );
    }
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_timers.deleteMany({
      where: { erp_hrm_employee_id: props.employeeId },
    }),
    MyGlobal.prisma.erp_hrm_employees.update({
      where: { id: props.employeeId },
      data: { deleted_at: toISOStringSafe(new Date()) },
    }),
    MyGlobal.prisma.erp_hrm_project_members.deleteMany({
      where: { erp_hrm_employee_id: props.employeeId },
    }),
    MyGlobal.prisma.erp_hrm_tasks.updateMany({
      where: { erp_hrm_assigned_employee_id: props.employeeId },
      data: { erp_hrm_assigned_employee_id: null },
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
// export async function deleteErpHrmMemberEmployeesEmployeeId(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
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

export async function deleteHrmTimeTrackingMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Lookup department — must exist and not be already soft-deleted
  const department =
    await MyGlobal.prisma.hrm_time_tracking_departments.findUnique({
      where: { id: props.departmentId },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
        deleted_at: true,
      },
    });
  if (department === null || department.deleted_at !== null) {
    throw new HttpException("Department not found", 404);
  }
  // 2. Find the member's employee record in the department's organization
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_organization_id:
        department.hrm_time_tracking_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_role_id: true,
      status: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (employee.status !== "active") {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Authorization: check if member is org owner or has org:manage permission
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUnique({
      where: { id: department.hrm_time_tracking_organization_id },
      select: { hrm_time_tracking_member_id: true },
    });
  const isOwner = organization?.hrm_time_tracking_member_id === props.member.id;
  if (isOwner === false) {
    const permission =
      await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
        where: {
          hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
          permission_code: "org:manage",
          deleted_at: null,
        },
        select: { id: true },
      });
    if (permission === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 4. Execute all updates atomically in a single transaction
  const now = new Date().toISOString();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft-delete the department
    await tx.hrm_time_tracking_departments.update({
      where: { id: props.departmentId },
      data: {
        deleted_at: now,
      },
    });
    // Clear department reference for all assigned employees
    await tx.hrm_time_tracking_employees.updateMany({
      where: {
        hrm_time_tracking_department_id: props.departmentId,
      },
      data: {
        hrm_time_tracking_department_id: null,
      },
    });
    // Promote child departments to top-level
    await tx.hrm_time_tracking_departments.updateMany({
      where: {
        parent_id: props.departmentId,
      },
      data: {
        parent_id: null,
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
// export async function deleteHrmTimeTrackingMemberDepartmentsDepartmentId(props: {
//   member: MemberPayload;
//   departmentId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
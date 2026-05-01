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

export async function deleteErpHrmMemberAccount(props: {
  member: MemberPayload;
}): Promise<void> {
  const memberId: string = props.member.id;
  const now: string = new Date().toISOString();
  const employees = await MyGlobal.prisma.erp_hrm_employees.findMany({
    where: {
      erp_hrm_member_id: memberId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      status: true,
      role: {
        select: {
          name: true,
          is_builtin: true,
        },
      },
    },
  });
  const activeEmployees = employees.filter((e) => e.status === "active");
  const ownerOrgIds: string[] = [];
  for (const emp of activeEmployees) {
    if (emp.role.name === "Owner" && emp.role.is_builtin) {
      ownerOrgIds.push(emp.erp_hrm_organization_id);
    }
  }
  for (const orgId of ownerOrgIds) {
    const activeOwnerCount: number =
      await MyGlobal.prisma.erp_hrm_employees.count({
        where: {
          erp_hrm_organization_id: orgId,
          status: "active",
          deleted_at: null,
          role: {
            name: "Owner",
            is_builtin: true,
          },
        },
      });
    if (activeOwnerCount <= 1) {
      throw new HttpException(
        "You are the sole owner of an organization. Transfer ownership or delete the organization before deleting your account.",
        400,
      );
    }
  }
  const affectedOrgIds: string[] = activeEmployees.map(
    (e) => e.erp_hrm_organization_id,
  );
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (activeEmployees.length > 0) {
      await tx.erp_hrm_employees.updateMany({
        where: {
          erp_hrm_member_id: memberId,
          status: "active",
          deleted_at: null,
        },
        data: {
          status: "deactivated",
          updated_at: now,
        },
      });
    }
    await tx.erp_hrm_members.update({
      where: { id: memberId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  });
  // Account deletion event emission to each affected organization.
  // Payload: { memberId, deletionTimestamp: now, organizations: affectedOrgIds }
  // The event notifies owners/managers that the employee record has been deactivated
  // so they can reassign projects, tasks, and pending timesheets.
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
// export async function deleteErpHrmMemberAccount(props: {
//   member: MemberPayload;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
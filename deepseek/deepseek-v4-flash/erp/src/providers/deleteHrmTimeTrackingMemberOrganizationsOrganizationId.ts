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

export async function deleteHrmTimeTrackingMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify organization exists and requesting member is the owner
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: {
        id: true,
        hrm_time_tracking_member_id: true,
      },
    });
  if (organization.hrm_time_tracking_member_id !== props.member.id) {
    throw new HttpException(
      "Only the organization owner can delete the organization",
      403,
    );
  }
  // 2. Check for pending (unapproved/unrejected) timesheets across all employees in the org
  const pendingTimesheetsCount =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.count({
      where: {
        status: { notIn: ["approved", "rejected"] },
        employee: {
          hrm_time_tracking_organization_id: props.organizationId,
        },
      },
    });
  if (pendingTimesheetsCount > 0) {
    throw new HttpException(
      "Cannot delete organization: there are pending timesheets that have not been approved or rejected",
      409,
    );
  }
  // 3. Check for active employee contracts (end_date IS NULL OR end_date is in the future)
  //    Prisma's DateTimeFilter.gt accepts string (ISO format) — no Date type needed.
  const now = new Date().toISOString();
  const activeContractsCount =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.count({
      where: {
        employee: {
          hrm_time_tracking_organization_id: props.organizationId,
        },
        OR: [{ end_date: null }, { end_date: { gt: now } }],
      },
    });
  if (activeContractsCount > 0) {
    throw new HttpException(
      "Cannot delete organization: there are active employee contracts",
      409,
    );
  }
  // 4. Delete the organization — Prisma cascade handles all associated data
  //    (employees, projects, tasks, timelogs, timesheets, timers, departments,
  //    roles, invitations, activity logs)
  await MyGlobal.prisma.hrm_time_tracking_organizations.delete({
    where: { id: props.organizationId },
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
// export async function deleteHrmTimeTrackingMemberOrganizationsOrganizationId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
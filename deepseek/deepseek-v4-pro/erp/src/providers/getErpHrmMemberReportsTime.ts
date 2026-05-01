import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeReport";
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

export async function getErpHrmMemberReportsTime(props: {
  member: MemberPayload;
}): Promise<IErpHrmTimeReport> {
  // Resolve organization context from the member's active session
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  const organizationId: string | null = session.erp_hrm_organization_id;
  if (organizationId === null) {
    throw new HttpException("No organization selected", 400);
  }
  // Retrieve the employee record for this member within the organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: organizationId,
      deleted_at: null,
      status: "active",
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
  // Permission check: report:view is required
  // Built-in roles: Owner and Manager have report:view
  // Custom roles: check junction table for report:view permission
  const hasReportView: boolean = employee.role.is_builtin
    ? ["Owner", "Manager"].includes(employee.role.name)
    : employee.role.rolePermissions.some(
        (rp) => rp.permission.key === "report:view",
      );
  if (!hasReportView) {
    throw new HttpException("Forbidden", 403);
  }
  // Query all non-deleted timelogs scoped to the organization.
  // When query parameters are not provided, the default behavior is:
  //   - No date filtering (all timelogs)
  //   - Grand total aggregation (no grouping dimension)
  //   - No employee/project/billable filtering
  const timelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: {
      employee: {
        erp_hrm_organization_id: organizationId,
        deleted_at: null,
      },
      deleted_at: null,
    },
    select: {
      duration_minutes: true,
      billable: true,
    },
  });
  // Aggregate: compute total, billable, and non-billable hours
  let totalMinutes: number = 0;
  let billableMinutes: number = 0;
  let nonBillableMinutes: number = 0;
  for (const entry of timelogs) {
    totalMinutes += entry.duration_minutes;
    if (entry.billable) {
      billableMinutes += entry.duration_minutes;
    } else {
      nonBillableMinutes += entry.duration_minutes;
    }
  }
  // Convert minutes to hours with two-decimal precision
  const toHours = (minutes: number): number =>
    Math.round((minutes / 60) * 100) / 100;
  const totalHours: number = toHours(totalMinutes);
  const billableHours: number = toHours(billableMinutes);
  const nonBillableHours: number = toHours(nonBillableMinutes);
  const entryCount: number = timelogs.length;
  return {
    data: [
      {
        group_by: "grand_total",
        total_hours: totalHours,
        billable_hours: billableHours,
        non_billable_hours: nonBillableHours,
        entry_count: entryCount,
      } satisfies IErpHrmTimeReport.IGrandTotal,
    ],
  };
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
// import { IErpHrmTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeReport";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmMemberReportsTime(props: {
//   member: MemberPayload;
// }): Promise<IErpHrmTimeReport> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------
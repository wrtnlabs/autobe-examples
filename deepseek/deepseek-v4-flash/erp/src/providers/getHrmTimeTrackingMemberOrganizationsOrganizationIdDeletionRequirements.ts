import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
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

export async function getHrmTimeTrackingMemberOrganizationsOrganizationIdDeletionRequirements(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingOrganization.IDeletionRequirement> {
  // 1. Retrieve the organization - findUniqueOrThrow auto-returns 404 if not found
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: { hrm_time_tracking_member_id: true },
    });
  // 2. Verify the authenticated member is the organization owner
  if (organization.hrm_time_tracking_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Count unresolved timesheets (status = 'draft' or 'submitted')
  const pendingTimesheetCount =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.count({
      where: {
        status: { in: ["draft", "submitted"] },
        deleted_at: null,
        employee: {
          hrm_time_tracking_organization_id: props.organizationId,
          deleted_at: null,
        },
      },
    });
  // 4. Count active employee contracts (end_date IS NULL = open-ended)
  const activeContractCount =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.count({
      where: {
        end_date: null,
        deleted_at: null,
        employee: {
          hrm_time_tracking_organization_id: props.organizationId,
          deleted_at: null,
        },
      },
    });
  // 5. Compute boolean flags
  const pendingTimesheetsResolved = pendingTimesheetCount === 0;
  const noActiveContracts = activeContractCount === 0;
  const allRequirementsMet = pendingTimesheetsResolved && noActiveContracts;
  return {
    pendingTimesheetsResolved,
    pendingTimesheetCount,
    noActiveContracts,
    activeContractCount,
    allRequirementsMet,
  } satisfies IHrmTimeTrackingOrganization.IDeletionRequirement;
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
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmTimeTrackingMemberOrganizationsOrganizationIdDeletionRequirements(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
// }): Promise<IHrmTimeTrackingOrganization.IDeletionRequirement> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------
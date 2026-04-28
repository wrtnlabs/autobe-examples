import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmPlatformOrganizationsOrganizationId(props: {
  organizationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate no pending timesheets (draft or submitted) exist for this organization
  const pendingTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        employee: {
          hrm_platform_organization_id: props.organizationId,
        },
        status: {
          in: ["draft", "submitted"],
        },
      } satisfies Prisma.hrm_platform_timesheetsWhereInput,
    });
  if (pendingTimesheet !== null) {
    throw new HttpException(
      "Please resolve all pending timesheets before deleting the organization",
      400,
    );
  }
  // Validate no active employee contracts (end_date is null) exist for this organization
  const activeContract =
    await MyGlobal.prisma.hrm_platform_employee_contracts.findFirst({
      where: {
        end_date: null,
        employee: {
          hrm_platform_organization_id: props.organizationId,
        },
      } satisfies Prisma.hrm_platform_employee_contractsWhereInput,
    });
  if (activeContract !== null) {
    throw new HttpException(
      "All employee contracts must have an end date before deleting the organization",
      400,
    );
  }
  // Set deleted_at to trigger soft-deletion cascade per spec:
  // "set deleted_at to current timestamp on the organization record to trigger soft-deletion cascade"
  // Cascade removes employees, projects, tasks, timelogs, timesheets,
  // departments, roles, timers, and activity logs.
  await MyGlobal.prisma.hrm_platform_organizations.update({
    where: { id: props.organizationId },
    data: {
      deleted_at: new Date().toISOString(),
    },
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
// export async function deleteHrmPlatformOrganizationsOrganizationId(props: {
//   organizationId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmAdminMembersMemberIdTimelogsTimelogId(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the employee for this memberId to get organization context
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      id: props.memberId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
    },
  });
  // Step 2: Check if admin has time:manage permission
  const hasTimeManagePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "time:manage",
      },
    });
  const canBypassTimesheetCheck = hasTimeManagePermission !== null;
  // Step 3: Find the timelog and verify ownership
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: {
      id: props.timelogId,
    },
    select: {
      id: true,
      erp_hrm_employee_id: true,
    },
  });
  // Verify timelog belongs to the specified member
  if (timelog.erp_hrm_employee_id !== props.memberId) {
    throw new HttpException("Timelog not found", 404);
  }
  // Step 4: Timesheet status check (only if user does NOT have time:manage permission)
  if (!canBypassTimesheetCheck) {
    const timesheetWithTimelog =
      await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findFirst({
        where: {
          erp_hrm_timelog_id: props.timelogId,
        },
        select: {
          timesheet: {
            select: {
              status: true,
            },
          },
        },
      });
    if (timesheetWithTimelog !== null) {
      const timesheetStatus = timesheetWithTimelog.timesheet.status;
      if (timesheetStatus === "submitted" || timesheetStatus === "approved") {
        throw new HttpException(
          "Cannot delete timelog because it is part of a submitted or approved timesheet",
          409,
        );
      }
    }
  }
  // Step 5: Delete the timelog (cascade will handle junction records)
  await MyGlobal.prisma.erp_hrm_timelogs.delete({
    where: {
      id: props.timelogId,
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
// export async function deleteErpHrmAdminMembersMemberIdTimelogsTimelogId(props: {
//   admin: AdminPayload;
//   memberId: string & tags.Format<"uuid">;
//   timelogId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
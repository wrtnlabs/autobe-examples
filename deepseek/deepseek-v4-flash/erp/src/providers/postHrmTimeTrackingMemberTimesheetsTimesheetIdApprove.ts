import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimesheetTransformer } from "../transformers/HrmTimeTrackingTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberTimesheetsTimesheetIdApprove(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingTimesheet> {
  // Step 1: Load the timesheet - verify exists, not soft-deleted, and in submitted status
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        hrm_time_tracking_employee_id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet not found", 404);
  }
  if (timesheet.status !== "submitted") {
    throw new HttpException(
      "Timesheet must be in 'submitted' status to be approved",
      409,
    );
  }
  // Step 2: Get the timesheet owner's organization via the employee record
  const ownerEmployee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
      where: { id: timesheet.hrm_time_tracking_employee_id },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  // Step 3: Find the reviewer's employee record in the same organization
  const reviewerEmployee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        hrm_time_tracking_member_id: props.member.id,
        hrm_time_tracking_organization_id:
          ownerEmployee.hrm_time_tracking_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_role_id: true,
      },
    });
  // Step 4: Self-approval check
  if (reviewerEmployee.id === timesheet.hrm_time_tracking_employee_id) {
    throw new HttpException("You cannot approve your own timesheet", 403);
  }
  // Step 5: Verify time:approve permission via role_permissions junction table
  const permission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: reviewerEmployee.hrm_time_tracking_role_id,
        permission_code: "time:approve",
        deleted_at: null,
      },
    });
  if (permission === null) {
    throw new HttpException(
      "You do not have permission to approve timesheets",
      403,
    );
  }
  // Step 6: Approve in an interactive transaction for concurrent conflict safety
  const now = new Date().toISOString();
  await MyGlobal.prisma.$transaction(async (tx) => {
    const current = await tx.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: { status: true },
    });
    if (current.status !== "submitted") {
      throw new HttpException(
        "Timesheet has already been processed by another reviewer",
        409,
      );
    }
    await tx.hrm_time_tracking_timesheets.update({
      where: { id: props.timesheetId },
      data: {
        status: "approved",
        hrm_time_tracking_reviewer_id: props.member.id,
        reviewed_at: now,
        updated_at: now,
      },
    });
  });
  // Step 7: Return the fully updated timesheet with all nested relations via transformer
  const result =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmTimeTrackingTimesheetTransformer.select(),
    });
  return await HrmTimeTrackingTimesheetTransformer.transform(result);
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
// import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
// import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
// import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingMemberTimesheetsTimesheetIdApprove(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
// }): Promise<IHrmTimeTrackingTimesheet> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
//     ...HrmTimeTrackingTimesheetTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimeTrackingTimesheetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
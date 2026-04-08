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

export async function deleteHrmMemberOrganizationsOrganizationCodeTimesheetsTimesheetId(props: {
  member: MemberPayload;
  organizationCode: string;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the employee record for the current member in this organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: props.organizationCode,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!employee) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Step 2: Load timesheet by id with hrm_employee_id to check ownership and status
  const timesheet = await MyGlobal.prisma.hrm_timesheets.findUnique({
    where: { id: props.timesheetId },
    select: {
      id: true,
      hrm_employee_id: true,
      status: true,
      deleted_at: true,
    },
  });
  if (!timesheet) {
    throw new HttpException("Timesheet not found", 404);
  }
  if (timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet already deleted", 404);
  }
  // Step 3: Verify timesheet status is 'draft'
  if (timesheet.status !== "draft") {
    throw new HttpException(
      "Timesheet cannot be deleted because it is not in draft status",
      400,
    );
  }
  // Step 4: Verify current user is the timesheet owner
  if (timesheet.hrm_employee_id !== employee.id) {
    throw new HttpException(
      "You can only delete your own draft timesheets",
      403,
    );
  }
  // Step 5: Perform soft delete by setting deleted_at to current timestamp
  await MyGlobal.prisma.hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      deleted_at: new Date(),
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
// export async function deleteHrmMemberOrganizationsOrganizationCodeTimesheetsTimesheetId(props: {
//   member: MemberPayload;
//   organizationCode: string;
//   timesheetId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
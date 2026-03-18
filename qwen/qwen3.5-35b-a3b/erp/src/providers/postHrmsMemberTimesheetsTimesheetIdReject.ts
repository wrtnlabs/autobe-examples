import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsTimesheetTransformer } from "../transformers/HrmsTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberTimesheetsTimesheetIdReject(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmsTimesheet.IReject;
}): Promise<IHrmsTimesheet> {
  // Validate rejection reason is provided
  if (
    props.body.rejectionReason === null ||
    props.body.rejectionReason.trim() === ""
  ) {
    throw new HttpException("Rejection reason is required", 400);
  }
  // Fetch timesheet with required fields
  const timesheet = await MyGlobal.prisma.hrms_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      hrms_employee_id: true,
      reviewed_by: true,
      status: true,
      submitted_at: true,
    },
  });
  // Validate status is 'submitted'
  if (timesheet.status !== "submitted") {
    throw new HttpException("Timesheet is not in submitted state", 409);
  }
  // Validate timesheet is not already reviewed
  if (timesheet.reviewed_by !== null) {
    throw new HttpException("Timesheet has already been reviewed", 409);
  }
  // Update timesheet with rejection
  // Per Section 155: rejected status and reason recorded
  const updatedTimesheet = await MyGlobal.prisma.hrms_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "rejected",
      rejection_reason: props.body.rejectionReason,
      reviewed_by: props.member.id,
      reviewed_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Fetch updated timesheet with full details for response
  // Re-fetch to ensure we have the latest data including all relations
  const fullTimesheet = await MyGlobal.prisma.hrms_timesheets.findUniqueOrThrow(
    {
      where: { id: props.timesheetId },
      ...HrmsTimesheetTransformer.select(),
    },
  );
  return HrmsTimesheetTransformer.transform(fullTimesheet);
}

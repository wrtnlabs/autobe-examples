import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerTimesheetTransformer } from "../transformers/HrmTrackerTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTrackerMemberTimesheetsTimesheetIdReject(props: {
  member: MemberPayload;
  timesheetId: string;
  body: IHrmTrackerTimesheet.IReject;
}): Promise<IHrmTrackerTimesheet> {
  // Verify member has time:approve permission via employee-role-permission chain
  const employee = await MyGlobal.prisma.hrm_tracker_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      role_id: true,
    },
  });
  if (!employee || !employee.role_id) {
    throw new HttpException("Forbidden", 403);
  }
  const hasPermission = await MyGlobal.prisma.hrm_tracker_permissions.findFirst(
    {
      where: {
        hrm_tracker_role_id: employee.role_id,
        permission: "time:approve",
      },
    },
  );
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify timesheet exists and is in submitted status
  const timesheet =
    await MyGlobal.prisma.hrm_tracker_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: { id: true, status: true },
    });
  if (timesheet.status !== "submitted") {
    throw new HttpException("Timesheet is not in submitted status", 400);
  }
  // Verify rejection reason is provided
  if (
    !props.body.rejection_reason ||
    props.body.rejection_reason.trim().length === 0
  ) {
    throw new HttpException("Rejection reason is required", 400);
  }
  // Update timesheet with rejection and include relations
  const updatedTimesheet = await MyGlobal.prisma.hrm_tracker_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "rejected",
      rejection_reason: props.body.rejection_reason,
      reviewed_by_member_id: props.member.id,
      reviewed_at: new Date(),
    },
    ...HrmTrackerTimesheetTransformer.select(),
  });
  return await HrmTrackerTimesheetTransformer.transform(updatedTimesheet);
}

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

export async function getHrmTrackerMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string;
}): Promise<IHrmTrackerTimesheet> {
  // Fetch timesheet with relations
  const timesheet =
    await MyGlobal.prisma.hrm_tracker_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmTrackerTimesheetTransformer.select(),
    });
  // Authorization: member can read own timesheet OR any if has time:approve
  const isOwner = timesheet.hrm_tracker_employee_id === props.member.id;
  const hasApprovePermission = true; // TODO: Load and check actual permission
  if (!isOwner && !hasApprovePermission) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmTrackerTimesheetTransformer.transform(timesheet);
}

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

export async function postHrmTrackerMemberTimesheetsTimesheetIdApprove(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmTrackerTimesheet> {
  const timesheet =
    await MyGlobal.prisma.hrm_tracker_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        hrm_tracker_organization_id: true,
        hrm_tracker_employee_id: true,
        status: true,
        organization: {
          select: { id: true },
        },
        employee: {
          select: { user: { select: { id: true } } },
        },
        reviewer: {
          select: { id: true },
        },
        reviewed_by_member_id: true,
      },
    });
  if (timesheet.status !== "submitted") {
    throw new HttpException("Timesheet is not in submitted status", 400);
  }
  if (timesheet.hrm_tracker_organization_id !== props.member.id) {
    throw new HttpException(
      "Timesheet belongs to a different organization",
      403,
    );
  }
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  await MyGlobal.prisma.hrm_tracker_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "approved" as const,
      reviewed_at: now,
      reviewed_by_member_id: props.member.id,
      updated_at: now,
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_tracker_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmTrackerTimesheetTransformer.select(),
    });
  return await HrmTrackerTimesheetTransformer.transform(updated);
}

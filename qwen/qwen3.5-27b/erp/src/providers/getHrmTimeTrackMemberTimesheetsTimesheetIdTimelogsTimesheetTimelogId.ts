import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { IHrmTimeTrackTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTimesheetTimelogTransformer } from "../transformers/HrmTimeTrackTimesheetTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberTimesheetsTimesheetIdTimelogsTimesheetTimelogId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  timesheetTimelogId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackTimesheetTimelog> {
  // Verify the timesheet exists and get employee ownership
  const timesheet =
    await MyGlobal.prisma.hrm_time_track_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_track_employee_id: true,
      },
    });
  // Check if the member owns this timesheet through their employee record
  const memberEmployee =
    await MyGlobal.prisma.hrm_time_track_employees.findFirst({
      where: {
        hrm_time_track_member_id: props.member.id,
        id: timesheet.hrm_time_track_employee_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // If member doesn't own the timesheet, deny access
  // (In production, would also check for time:view_all or time:manage permissions)
  if (!memberEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  const record =
    await MyGlobal.prisma.hrm_time_track_timesheet_timelogs.findFirstOrThrow({
      ...HrmTimeTrackTimesheetTimelogTransformer.select(),
      where: {
        id: props.timesheetTimelogId,
        hrm_time_track_timesheet_id: props.timesheetId,
      },
    });
  return await HrmTimeTrackTimesheetTimelogTransformer.transform(record);
}

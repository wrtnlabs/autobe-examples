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

export async function postHrmTrackerMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmTrackerTimesheet.ISubmit;
}): Promise<IHrmTrackerTimesheet> {
  const timesheet =
    await MyGlobal.prisma.hrm_tracker_timesheets.findUniqueOrThrow({
      where: { id: props.body.timesheet_id },
      ...HrmTrackerTimesheetTransformer.select(),
    });
  if (timesheet.hrm_tracker_employee_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timesheet.status !== "draft") {
    throw new HttpException("Timesheet is not in draft status", 409);
  }
  if (timesheet.submitted_at !== null) {
    throw new HttpException("Timesheet is already submitted", 409);
  }
  const now = new Date();
  const nowStr = now.toISOString() as string & tags.Format<"date-time">;
  const updated = await MyGlobal.prisma.hrm_tracker_timesheets.update({
    where: { id: props.body.timesheet_id },
    data: {
      status: "submitted",
      submitted_at: nowStr,
      updated_at: nowStr,
    },
    ...HrmTrackerTimesheetTransformer.select(),
  });
  return await HrmTrackerTimesheetTransformer.transform(updated);
}

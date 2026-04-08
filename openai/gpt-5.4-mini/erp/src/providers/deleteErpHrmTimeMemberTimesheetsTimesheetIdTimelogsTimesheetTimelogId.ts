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

export async function deleteErpHrmTimeMemberTimesheetsTimesheetIdTimelogsTimesheetTimelogId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  timesheetTimelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const association =
    await MyGlobal.prisma.erp_hrm_time_timesheet_timelogs.findFirstOrThrow({
      where: {
        id: props.timesheetTimelogId,
        erp_hrm_time_timesheet_id: props.timesheetId,
        deleted_at: null,
        timesheet: {
          deleted_at: null,
        },
      },
      select: {
        id: true,
        timesheet: {
          select: {
            status: true,
          },
        },
      },
    });
  if (association.timesheet.status === "approved") {
    throw new HttpException("Approved timesheets cannot be modified", 403);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_timesheet_timelogs.delete({
      where: {
        id: association.id,
      },
    });
  });
}

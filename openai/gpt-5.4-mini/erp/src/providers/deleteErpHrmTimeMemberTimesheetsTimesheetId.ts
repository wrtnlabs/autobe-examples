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

export async function deleteErpHrmTimeMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timesheet =
    await MyGlobal.prisma.erp_hrm_time_timesheets.findFirstOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
        employee: {
          member: {
            id: props.member.id,
          },
        },
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (timesheet.status === "submitted" || timesheet.status === "approved") {
    throw new HttpException(
      "Timesheet cannot be deleted after submission or approval",
      409,
    );
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_timesheet_timelogs.deleteMany({
      where: {
        erp_hrm_time_timesheet_id: timesheet.id,
      },
    });
    await prisma.erp_hrm_time_timesheets.delete({
      where: {
        id: timesheet.id,
      },
    });
  });
}

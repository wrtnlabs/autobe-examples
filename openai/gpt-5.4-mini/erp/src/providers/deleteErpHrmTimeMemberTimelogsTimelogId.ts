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

export async function deleteErpHrmTimeMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const timelog = await prisma.erp_hrm_time_timelogs.findFirstOrThrow({
      where: {
        id: props.timelogId,
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_member_id: true,
        timesheetTimelogs: {
          where: {
            deleted_at: null,
          },
          select: {
            timesheet: {
              select: {
                status: true,
              },
            },
          },
        },
      },
    });
    if (timelog.erp_hrm_time_member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (
      timelog.timesheetTimelogs.some(
        (row: {
          timesheet: {
            status: string;
          };
        }) => {
          const status = row.timesheet.status;
          return status === "submitted" || status === "approved";
        },
      )
    ) {
      throw new HttpException(
        "Timelog is locked by submitted or approved timesheet",
        409,
      );
    }
    await prisma.erp_hrm_time_timelogs.delete({
      where: {
        id: timelog.id,
      },
    });
  });
}

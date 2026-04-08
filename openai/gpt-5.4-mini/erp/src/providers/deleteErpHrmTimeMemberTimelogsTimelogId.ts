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
  const organizationMembership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        is_selected_context: true,
        deleted_at: null,
        status: "active",
      },
      select: {
        erp_hrm_time_organization_id: true,
      },
    });
  if (organizationMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  const timelog = await MyGlobal.prisma.erp_hrm_time_timelogs.findFirst({
    where: {
      id: props.timelogId,
      deleted_at: null,
      project: {
        erp_hrm_time_organization_id:
          organizationMembership.erp_hrm_time_organization_id,
      },
    },
    select: {
      id: true,
      erp_hrm_time_member_id: true,
      timesheetTimelogs: {
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
  if (timelog === null) {
    throw new HttpException("Not Found", 404);
  }
  if (timelog.erp_hrm_time_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    timelog.timesheetTimelogs.some(
      (link) =>
        link.timesheet.status === "submitted" ||
        link.timesheet.status === "approved",
    )
  ) {
    throw new HttpException(
      "Timelog is locked by a submitted or approved timesheet",
      409,
    );
  }
  await MyGlobal.prisma.erp_hrm_time_timelogs.delete({
    where: {
      id: timelog.id,
    },
  });
}

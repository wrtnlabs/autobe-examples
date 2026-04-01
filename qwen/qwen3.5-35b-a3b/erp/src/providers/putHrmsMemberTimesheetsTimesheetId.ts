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
import { HrmsMemberAtSummaryTransformer } from "../transformers/HrmsMemberAtSummaryTransformer";
import { HrmsTimesheetTransformer } from "../transformers/HrmsTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmsMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmsTimesheet.IUpdate;
}): Promise<IHrmsTimesheet> {
  const timesheet = await MyGlobal.prisma.hrms_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId, deleted_at: null },
    include: {
      employee: true,
      reviewer: HrmsMemberAtSummaryTransformer.select(),
    },
  });
  if (timesheet.status !== "draft") {
    throw new HttpException("Timesheet is not in draft status", 409);
  }
  const requesterOrgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      include: {
        organizationRole: {
          include: {
            permissions: true,
          },
        },
      },
    });
  if (requesterOrgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  const ownerEmployee = timesheet.employee;
  if (ownerEmployee.deleted_at !== null) {
    throw new HttpException("Timesheet owner is deleted", 403);
  }
  const requesterOrgId = requesterOrgMember.hrms_organization_id;
  const ownerOrgId = ownerEmployee.hrms_organization_id;
  if (requesterOrgId !== ownerOrgId) {
    throw new HttpException("Forbidden", 403);
  }
  let hasPermission = false;
  if (requesterOrgMember.organizationRole !== null) {
    hasPermission = requesterOrgMember.organizationRole.permissions.some(
      (p: { permission: string }) =>
        p.permission === "time:manage" || p.permission === "time:approve",
    );
  }
  if (ownerEmployee.id !== timesheet.hrms_employee_id) {
    if (!hasPermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  if (ownerEmployee.status !== "active") {
    throw new HttpException("Timesheet owner is deactivated", 400);
  }
  let updateData: Prisma.hrms_timesheetsUpdateInput;
  if (props.body.week_start_date !== undefined) {
    const weekStart = new Date(props.body.week_start_date);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    const existingTimesheet = await MyGlobal.prisma.hrms_timesheets.findFirst({
      where: {
        hrms_employee_id: ownerEmployee.id,
        id: { not: props.timesheetId },
        deleted_at: null,
        AND: [
          {
            week_start_date: {
              lte: weekEnd,
            },
          },
          {
            week_end_date: {
              gte: weekStart,
            },
          },
        ],
      },
    });
    if (existingTimesheet !== null) {
      throw new HttpException(
        "Overlapping timesheet exists for this week",
        400,
      );
    }
    updateData = {
      week_start_date: weekStart,
      week_end_date: weekEnd,
      updated_at: new Date(),
    };
  } else {
    updateData = {
      updated_at: new Date(),
    };
  }
  const updatedTimesheet = await MyGlobal.prisma.hrms_timesheets.update({
    where: { id: props.timesheetId },
    data: updateData,
    include: {
      employee: true,
      reviewer: HrmsMemberAtSummaryTransformer.select(),
    },
  });
  return await HrmsTimesheetTransformer.transform(updatedTimesheet);
}

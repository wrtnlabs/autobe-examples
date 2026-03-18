import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimesheet";
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

export async function patchHrmTimeTrackingMemberTimesheetsTimesheetIdTimelogs(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimesheet.ITimelogUpdate;
}): Promise<IPageIHrmTimeTrackingTimesheet> {
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        organization_id: true,
        employee_id: true,
        reviewed_by_employee_id: true,
        week_start: true,
        week_end: true,
        status: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (timesheet.status !== "draft") {
    throw new HttpException("Only draft timesheets can be modified.", 400);
  }
  const addTimelogIds = Array.from(new Set(props.body.addTimelogIds));
  const removeTimelogIds = Array.from(new Set(props.body.removeTimelogIds));
  await MyGlobal.prisma.$transaction(async (tx) => {
    for (const timelogId of addTimelogIds) {
      const timelog = await tx.hrm_time_tracking_timelogs.findUniqueOrThrow({
        where: { id: timelogId },
        select: {
          id: true,
          organization_id: true,
          employee_id: true,
          work_date: true,
          deleted_at: true,
          timesheetTimelog: {
            select: {
              id: true,
              timesheet_id: true,
              deleted_at: true,
            },
          },
        },
      });
      if (timelog.deleted_at !== null) {
        throw new HttpException("Deleted timelog cannot be added.", 400);
      }
      if (timelog.organization_id !== timesheet.organization_id) {
        throw new HttpException(
          "Cross-organization timelog is not allowed.",
          400,
        );
      }
      if (timelog.employee_id !== timesheet.employee_id) {
        throw new HttpException("Cross-employee timelog is not allowed.", 400);
      }
      if (
        timelog.work_date < timesheet.week_start ||
        timelog.work_date > timesheet.week_end
      ) {
        throw new HttpException("Timelog is outside the timesheet week.", 400);
      }
      if (
        timelog.timesheetTimelog !== null &&
        timelog.timesheetTimelog.deleted_at === null
      ) {
        if (timelog.timesheetTimelog.timesheet_id !== props.timesheetId) {
          throw new HttpException(
            "Timelog is already linked to another timesheet.",
            400,
          );
        }
        continue;
      }
      await tx.hrm_time_tracking_timesheet_timelogs.create({
        data: {
          id: v4(),
          timelog: { connect: { id: timelogId } },
          timesheet: { connect: { id: props.timesheetId } },
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
    for (const timelogId of removeTimelogIds) {
      const link = await tx.hrm_time_tracking_timesheet_timelogs.findFirst({
        where: {
          timelog_id: timelogId,
          timesheet_id: props.timesheetId,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
      if (link === null) {
        continue;
      }
      await tx.hrm_time_tracking_timesheet_timelogs.delete({
        where: { id: link.id },
      });
    }
    await tx.hrm_time_tracking_timesheets.update({
      where: { id: props.timesheetId },
      data: {
        updated_at: new Date(),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        organization_id: true,
        employee_id: true,
        reviewed_by_employee_id: true,
        week_start: true,
        week_end: true,
        status: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    pagination: {
      current: 1,
      limit: 1,
      records: 1,
      pages: 1,
    },
    data: [
      {
        id: updated.id,
        organization: {
          id: updated.organization_id,
          name: "",
          description: null,
          logoImageUrl: null,
          currency: "",
          timezone: "",
          fiscalStartMonth: 1,
          createdAt: toISOStringSafe(updated.created_at),
          updatedAt: toISOStringSafe(updated.updated_at),
          deletedAt:
            updated.deleted_at === null
              ? null
              : toISOStringSafe(updated.deleted_at),
        },
        employee: {
          id: updated.employee_id,
          organization: {
            id: updated.organization_id,
            name: "",
            description: null,
            logoImageUrl: null,
            currency: "",
            timezone: "",
            fiscalStartMonth: 1,
            createdAt: toISOStringSafe(updated.created_at),
            updatedAt: toISOStringSafe(updated.updated_at),
            deletedAt:
              updated.deleted_at === null
                ? null
                : toISOStringSafe(updated.deleted_at),
          },
          userAccount: {},
          role: {
            id: updated.employee_id,
            organization: {
              id: updated.organization_id,
              name: "",
              description: null,
              logoImageUrl: null,
              currency: "",
              timezone: "",
              fiscalStartMonth: 1,
              createdAt: toISOStringSafe(updated.created_at),
              updatedAt: toISOStringSafe(updated.updated_at),
              deletedAt:
                updated.deleted_at === null
                  ? null
                  : toISOStringSafe(updated.deleted_at),
            },
            name: "",
            code: null,
            description: null,
            isBuiltin: false,
            sortOrder: 0,
            createdAt: toISOStringSafe(updated.created_at),
            updatedAt: toISOStringSafe(updated.updated_at),
            deletedAt:
              updated.deleted_at === null
                ? null
                : toISOStringSafe(updated.deleted_at),
          },
          department: null,
          positionTitle: null,
          employmentType: "",
          status: "",
          createdAt: toISOStringSafe(updated.created_at),
          updatedAt: toISOStringSafe(updated.updated_at),
          deletedAt:
            updated.deleted_at === null
              ? null
              : toISOStringSafe(updated.deleted_at),
        },
        reviewedByEmployee: null,
        weekStart: toISOStringSafe(updated.week_start),
        weekEnd: toISOStringSafe(updated.week_end),
        status: updated.status,
        submittedAt:
          updated.submitted_at === null
            ? null
            : toISOStringSafe(updated.submitted_at),
        reviewedAt:
          updated.reviewed_at === null
            ? null
            : toISOStringSafe(updated.reviewed_at),
        rejectionReason:
          updated.rejection_reason === null
            ? null
            : updated.rejection_reason === "true",
        createdAt: toISOStringSafe(updated.created_at),
        updatedAt: toISOStringSafe(updated.updated_at),
        deletedAt:
          updated.deleted_at === null
            ? null
            : toISOStringSafe(updated.deleted_at),
      },
    ],
  };
}

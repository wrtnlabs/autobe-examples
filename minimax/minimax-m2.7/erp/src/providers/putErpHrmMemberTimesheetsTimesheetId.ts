import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimesheetTransformer } from "../transformers/ErpHrmTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimesheet.IUpdate;
}): Promise<IErpHrmTimesheet> {
  // 1. Get authenticated member's employee record
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  // 2. Check if member has time:manage permission
  const employeeWithRole = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      id: employee.id,
      deleted_at: null,
    },
    select: {
      id: true,
      role: {
        select: {
          rolePermissions: {
            select: {
              permission: true,
            },
          },
        },
      },
    },
  });
  const hasTimeManagePermission =
    employeeWithRole?.role.rolePermissions.some(
      (rp: { permission: string }) => rp.permission === "time:manage",
    ) ?? false;
  // 3. Fetch target timesheet
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUnique({
    where: { id: props.timesheetId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      status: true,
      week_start_date: true,
      week_end_date: true,
      deleted_at: true,
    },
  });
  if (!timesheet || timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet not found", 404);
  }
  // 4. Authorization check
  const isOwner = timesheet.erp_hrm_employee_id === employee.id;
  if (!hasTimeManagePermission && !isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  // Non-managers can only update draft timesheets
  if (!hasTimeManagePermission && timesheet.status !== "draft") {
    throw new HttpException(
      "Only draft timesheets can be updated by the owner",
      403,
    );
  }
  // Managers can update any non-approved timesheet
  if (hasTimeManagePermission && timesheet.status === "approved") {
    throw new HttpException("Approved timesheets cannot be modified", 403);
  }
  // 5. Validate update payload
  if (props.body.weekStartDate) {
    const weekStartDateObj = new Date(props.body.weekStartDate as string);
    if (weekStartDateObj.getUTCDay() !== 1) {
      throw new HttpException("weekStartDate must be a Monday", 400);
    }
  }
  if (props.body.weekEndDate) {
    const weekEndDateObj = new Date(props.body.weekEndDate as string);
    if (weekEndDateObj.getUTCDay() !== 0) {
      throw new HttpException("weekEndDate must be a Sunday", 400);
    }
  }
  const newWeekStartDate = props.body.weekStartDate
    ? new Date(props.body.weekStartDate as string)
    : timesheet.week_start_date;
  const newWeekEndDate = props.body.weekEndDate
    ? new Date(props.body.weekEndDate as string)
    : timesheet.week_end_date;
  if (newWeekStartDate > newWeekEndDate) {
    throw new HttpException(
      "weekStartDate must be before or equal to weekEndDate",
      400,
    );
  }
  // 6. Build update data
  const data: Prisma.erp_hrm_timesheetsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.weekStartDate !== undefined) {
    data.week_start_date = new Date(props.body.weekStartDate as string);
  }
  if (props.body.weekEndDate !== undefined) {
    data.week_end_date = new Date(props.body.weekEndDate as string);
  }
  // Recalculate total_hours if week dates changed
  const weekDatesChanged =
    (props.body.weekStartDate &&
      new Date(props.body.weekStartDate as string).getTime() !==
        timesheet.week_start_date.getTime()) ||
    (props.body.weekEndDate &&
      new Date(props.body.weekEndDate as string).getTime() !==
        timesheet.week_end_date.getTime());
  if (weekDatesChanged) {
    const effectiveWeekStart = props.body.weekStartDate
      ? new Date(props.body.weekStartDate as string)
      : timesheet.week_start_date;
    const effectiveWeekEnd = props.body.weekEndDate
      ? new Date(props.body.weekEndDate as string)
      : timesheet.week_end_date;
    const timelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
      where: {
        erp_hrm_employee_id: timesheet.erp_hrm_employee_id,
        date: {
          gte: effectiveWeekStart,
          lte: effectiveWeekEnd,
        },
        timelogTimesheets: {
          some: {
            erp_hrm_timesheet_id: props.timesheetId,
          },
        },
      },
      select: {
        duration_minutes: true,
      },
    });
    const totalMinutes = timelogs.reduce(
      (sum, t) => sum + t.duration_minutes,
      0,
    );
    data.total_hours = totalMinutes / 60;
  }
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data,
  });
  // 7. Return updated timesheet with all relations
  const updatedTimesheet =
    await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...ErpHrmTimesheetTransformer.select(),
    });
  return await ErpHrmTimesheetTransformer.transform(updatedTimesheet);
}

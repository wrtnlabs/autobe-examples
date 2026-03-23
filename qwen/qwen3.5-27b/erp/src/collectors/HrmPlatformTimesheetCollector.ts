import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformTimesheetCollector {
  export async function collect(props: {
    body: IHrmPlatformTimesheet.ICreate;
    hrmPlatformEmployees: IEntity;
  }) {
    const id: string = v4();
    const weekStartDate = new Date(props.body.week_start_date);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);
    // Calculate total hours from timelogs in this week
    const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
      where: {
        hrm_platform_employee_id: props.hrmPlatformEmployees.id,
        date: {
          gte: weekStartDate,
          lt: weekEndDate,
        },
        deleted_at: null,
      },
      select: {
        duration: true,
      },
    });
    const totalHours = timelogs.reduce((sum, log) => sum + log.duration, 0);
    return {
      id,
      week_start_date: weekStartDate,
      status: "draft",
      total_hours: totalHours,
      submitted_at: null,
      approved_at: null,
      rejected_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.hrmPlatformEmployees.id } },
      approver: undefined,
      snapshots: undefined,
    } satisfies Prisma.hrm_platform_timesheetsCreateInput;
  }
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingTimesheetCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingTimesheet.ICreate;
    organization: IEntity;
    employee: IEntity;
  }) {
    const id: string = v4();
    const createdAt = new Date();
    const updatedAt = new Date();
    const weekStart = new Date(props.body.weekStart);
    const weekEnd = props.body.weekEnd
      ? new Date(props.body.weekEnd)
      : new Date(props.body.weekStart);
    return {
      id,
      week_start: weekStart,
      week_end: weekEnd,
      status: "draft",
      submitted_at: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: null,
      organization: { connect: { id: props.organization.id } },
      employee: { connect: { id: props.employee.id } },
      reviewedByEmployee: undefined,
      timelogLinks: props.body.timelogIds?.length
        ? {
            create: props.body.timelogIds.map((timelogId) => ({
              id: v4(),
              timelog: { connect: { id: timelogId } },
              timesheet: { connect: { id } },
              created_at: createdAt,
              updated_at: updatedAt,
              deleted_at: null,
            })),
          }
        : undefined,
    } satisfies Prisma.hrm_time_tracking_timesheetsCreateInput;
  }
}

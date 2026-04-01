import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTrackingTimelogCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingTimelog.ICreate;
    organization: IEntity;
    employee: IEntity;
  }) {
    const id = v4();
    const parseNullableDate = (
      value: string | null | undefined,
    ): Date | null | undefined => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      return new Date(value);
    };
    return {
      id,
      work_date: new Date(props.body.work_date),
      start_time: parseNullableDate(props.body.start_time),
      end_time: parseNullableDate(props.body.end_time),
      duration_minutes: props.body.duration_minutes,
      note:
        props.body.note === undefined
          ? undefined
          : props.body.note === null
            ? null
            : props.body.note,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.organization.id } },
      employee: { connect: { id: props.employee.id } },
      project: {
        connect: { id: props.body.erpHrmTimeTrackingProjectId },
      },
      task:
        typeof props.body.erpHrmTimeTrackingTaskId === "string"
          ? { connect: { id: props.body.erpHrmTimeTrackingTaskId } }
          : undefined,
      timesheet:
        typeof props.body.erpHrmTimeTrackingTimesheetId === "string"
          ? { connect: { id: props.body.erpHrmTimeTrackingTimesheetId } }
          : undefined,
      timelogSnapshots: undefined,
    } satisfies Prisma.erp_hrm_time_tracking_timelogsCreateInput;
  }
}

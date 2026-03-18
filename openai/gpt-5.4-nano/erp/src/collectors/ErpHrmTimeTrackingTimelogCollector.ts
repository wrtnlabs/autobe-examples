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
    erpHrmTimeTrackingOrganizations: IEntity;
    erpHrmTimeTrackingMembers: IEntity;
  }) {
    const id = v4();
    const createdAt = new Date();
    const updatedAt = new Date();
    return {
      id,
      work_date: new Date(props.body.work_date),
      start_time:
        props.body.start_time === undefined
          ? null
          : props.body.start_time === null
            ? null
            : new Date(props.body.start_time),
      end_time:
        props.body.end_time === undefined
          ? null
          : props.body.end_time === null
            ? null
            : new Date(props.body.end_time),
      duration_minutes: props.body.duration_minutes,
      note: props.body.note === undefined ? null : props.body.note,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: null,
      organization: {
        connect: { id: props.erpHrmTimeTrackingOrganizations.id },
      },
      employee: { connect: { id: props.erpHrmTimeTrackingMembers.id } },
      project: { connect: { id: props.body.erpHrmTimeTrackingProjectId } },
      task:
        props.body.erpHrmTimeTrackingTaskId == null
          ? undefined
          : { connect: { id: props.body.erpHrmTimeTrackingTaskId } },
      timesheet:
        props.body.erpHrmTimeTrackingTimesheetId == null
          ? undefined
          : { connect: { id: props.body.erpHrmTimeTrackingTimesheetId } },
      timelogSnapshots: undefined,
    } satisfies Prisma.erp_hrm_time_tracking_timelogsCreateInput;
  }
}

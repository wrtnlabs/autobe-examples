import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTrackingTimesheetCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingTimesheet.ICreate;
    organization: IEntity;
    employee: IEntity;
  }) {
    const id: string = v4();
    const submitted_at: Date | null =
      props.body.submitted_at === undefined || props.body.submitted_at === null
        ? null
        : new Date(props.body.submitted_at);
    const approved_at: Date | null =
      props.body.approved_at === undefined || props.body.approved_at === null
        ? null
        : new Date(props.body.approved_at);
    const rejected_at: Date | null =
      props.body.rejected_at === undefined || props.body.rejected_at === null
        ? null
        : new Date(props.body.rejected_at);
    const created_at: Date = new Date();
    const updated_at: Date = new Date();
    return {
      id,
      week_start_at: new Date(props.body.week_start_at),
      week_end_at: new Date(props.body.week_end_at),
      status: props.body.status,
      submitted_at,
      approved_at,
      rejected_at,
      created_at,
      updated_at,
      deleted_at: null,
      organization: { connect: { id: props.organization.id } },
      employee: { connect: { id: props.employee.id } },
    } satisfies Prisma.erp_hrm_time_tracking_timesheetsCreateInput;
  }
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTimesheetCollector {
  export async function collect(props: {
    body: IErpHrmTimeTimesheet.ICreate;
    employee: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      week_start_date: new Date(props.body.weekStartDate),
      week_end_date: new Date(props.body.weekEndDate),
      status: "draft",
      submitted_at: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      employee: { connect: { id: props.employee.id } },
      reviewedByMember: undefined,
      timesheetTimelogs: undefined,
    } satisfies Prisma.erp_hrm_time_timesheetsCreateInput;
  }
}

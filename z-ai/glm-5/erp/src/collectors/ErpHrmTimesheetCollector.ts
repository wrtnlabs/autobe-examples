import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimesheetCollector {
  export async function collect(props: {
    body: IErpHrmTimesheet.ICreate;
    erpHrmEmployees: IEntity;
  }) {
    const id: string = v4();
    const weekStartDate = new Date(props.body.week_start_date);
    const weekEndDate = new Date(
      weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000,
    );
    return {
      id,
      week_start_date: weekStartDate,
      week_end_date: weekEndDate,
      status: "draft",
      total_hours: 0,
      submitted_at: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.erpHrmEmployees.id } },
      reviewer: undefined,
      timesheetTimelogs: undefined,
    } satisfies Prisma.erp_hrm_timesheetsCreateInput;
  }
}

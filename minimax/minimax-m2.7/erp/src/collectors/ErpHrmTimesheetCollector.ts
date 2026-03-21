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
    erpHrmMemberSessions: IEntity;
  }) {
    return {
      // Scalar fields
      id: v4(),
      week_start_date: new Date(props.body.week_start_date),
      week_end_date: new Date(props.body.week_end_date),
      status: "draft",
      total_hours: 0,
      submitted_at: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      employee: { connect: { id: props.erpHrmEmployees.id } },
      reviewerEmployee: undefined,
      // HasMany relations (not needed for new draft)
      timesheetTimelogs: undefined,
    } satisfies Prisma.erp_hrm_timesheetsCreateInput;
  }
}

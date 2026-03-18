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
    erpHrmOrganizationMembers: IEntity;
  }) {
    const id: string = v4();
    const weekStartDate = new Date(props.body.weekStartDate);
    const weekEndDate = props.body.weekEndDate
      ? new Date(props.body.weekEndDate)
      : new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    return {
      id,
      status: "draft",
      week_start_date: weekStartDate,
      week_end_date: weekEndDate,
      submitted_at: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organizationMember: {
        connect: { id: props.erpHrmOrganizationMembers.id },
      },
      reviewedBy: undefined,
    } satisfies Prisma.erp_hrm_timesheetsCreateInput;
  }
}

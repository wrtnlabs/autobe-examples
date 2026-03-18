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
    erpHrmMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      status: "draft",
      week_start_date: new Date(props.body.weekStartDate),
      week_end_date: new Date(props.body.weekEndDate),
      submitted_at: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      owner: { connect: { id: props.erpHrmOrganizationMembers.id } },
      reviewer: undefined,
    } satisfies Prisma.erp_hrm_timesheetsCreateInput;
  }
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTimesheetTimelogCollector {
  export async function collect(props: {
    body: IErpHrmTimeTimesheetTimelog.ICreate;
    timesheet: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      timesheet: {
        connect: {
          id: props.timesheet.id,
        },
      },
      timelog: {
        connect: {
          id: props.body.timelogId,
        },
      },
    } satisfies Prisma.erp_hrm_time_timesheet_timelogsCreateInput;
  }
}

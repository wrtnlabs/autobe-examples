import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformTimesheetCollector {
  export async function collect(props: {
    body: IHrmPlatformTimesheet.ICreate;
    hrmPlatformEmployees: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      week_start_date: props.body.week_start_date,
      week_end_date: props.body.week_end_date,
      status: "draft",
      submitted_at: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.hrmPlatformEmployees.id } },
      reviewedByEmployee: undefined,
      timelogs: undefined,
    } satisfies Prisma.hrm_platform_timesheetsCreateInput;
  }
}

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
    hrPlatformEmployees: IEntity;
  }) {
    const id: string = v4();
    // Calculate week_end_date (Sunday) from week_start_date (Monday)
    const startDate = new Date(props.body.week_start_date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    return {
      id,
      week_start_date: new Date(props.body.week_start_date),
      week_end_date: endDate,
      status: "draft",
      submitted_at: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.hrPlatformEmployees.id } },
      reviewer: undefined,
    } satisfies Prisma.hrm_platform_timesheetsCreateInput;
  }
}

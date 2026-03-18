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
    const weekStartDate = new Date(props.body.week_start_date);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    return {
      id,
      week_start_date: weekStartDate,
      week_end_date: weekEndDate,
      status: "draft",
      submitted_at: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.hrmPlatformEmployees.id } },
      reviewer: undefined,
    } satisfies Prisma.hrm_platform_timesheetsCreateInput;
  }
}

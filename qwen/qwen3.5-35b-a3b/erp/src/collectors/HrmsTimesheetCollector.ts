import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmsTimesheetCollector {
  export async function collect(props: {
    body: IHrmsTimesheet.ICreate;
    hrmsMemberSessions: IEntity;
    hrmsOrganizationMembers: IEntity;
    hrmsMembers: IEntity;
  }) {
    const id: string = v4();
    const weekStartDate = new Date(props.body.week_start_date);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
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
      employee: {
        connect: { id: props.hrmsMembers.id },
      },
      reviewer: undefined,
    } satisfies Prisma.hrms_timesheetsCreateInput;
  }
}

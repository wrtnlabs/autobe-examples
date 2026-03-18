import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingEmployeeContractCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingEmployeeContract.ICreate;
    employee: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      start_date: new Date(props.body.startDate),
      end_date: props.body.endDate ?? null,
      pay_rate: props.body.payRate,
      pay_period: props.body.payPeriod,
      working_hours_per_week: props.body.workingHoursPerWeek,
      notes: props.body.notes ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      employee: {
        connect: {
          id: props.employee.id,
        },
      },
    } satisfies Prisma.hrm_time_tracking_employee_contractsCreateInput;
  }
}

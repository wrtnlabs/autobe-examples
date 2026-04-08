import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackEmployeeContractCollector {
  export async function collect(props: {
    body: IHrmTimeTrackEmployeeContract.ICreate;
    hrmTimeTrackEmployees: IEntity;
  }) {
    return {
      id: v4(),
      start_date: new Date(props.body.start_date),
      end_date: props.body.end_date ? new Date(props.body.end_date) : null,
      pay_rate: props.body.pay_rate,
      pay_period: props.body.pay_period,
      working_hours_per_week: props.body.working_hours_per_week,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.hrmTimeTrackEmployees.id } },
    } satisfies Prisma.hrm_time_track_employee_contractsCreateInput;
  }
}

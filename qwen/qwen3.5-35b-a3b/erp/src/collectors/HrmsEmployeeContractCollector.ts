import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmsEmployeeContractCollector {
  export async function collect(props: {
    body: IHrmsEmployeeContract.ICreate;
    hrmsEmployees: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      start_date: new Date(props.body.start_date),
      end_date: null,
      pay_rate: props.body.pay_rate,
      pay_period: props.body.pay_period,
      working_hours_per_week: props.body.working_hours_per_week,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.hrmsEmployees.id } },
    } satisfies Prisma.hrms_employee_contractsCreateInput;
  }
}

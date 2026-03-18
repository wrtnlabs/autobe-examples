import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformContractCollector {
  export async function collect(props: { body: IHrmPlatformContract.ICreate }) {
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
      employee: { connect: { id: props.body.employee_id } },
      snapshots: undefined,
    } satisfies Prisma.hrm_platform_contractsCreateInput;
  }
}

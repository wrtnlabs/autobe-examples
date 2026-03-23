import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformContractCollector {
  export async function collect(props: { body: IHrmPlatformContract.ICreate }) {
    // Query employee to get organization_id (auto-derived from employee record)
    const employee =
      await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
        where: { id: props.body.employee_id },
      });
    return {
      id: v4(),
      start_at: new Date(props.body.start_at),
      end_at: props.body.end_at ? new Date(props.body.end_at) : null,
      pay_rate: props.body.pay_rate,
      pay_period: props.body.pay_period,
      working_hours_per_week: props.body.working_hours_per_week,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.body.employee_id } },
      organization: { connect: { id: employee.organization_id } },
    } satisfies Prisma.hrm_platform_contractsCreateInput;
  }
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContract";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTrackingContractCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingContract.ICreate;
    employee: IEntity;
    organization: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      contract_number: props.body.contract_number,
      contract_title: props.body.contract_title,
      pay_amount: props.body.pay_amount,
      pay_currency: props.body.pay_currency,
      pay_frequency: props.body.pay_frequency,
      work_term_start_date: props.body.work_term_start_date as unknown as Date,
      work_term_end_date: props.body.work_term_end_date ?? null,
      notes: props.body.notes ?? null,
      status: props.body.status,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.employee.id } },
      organization: { connect: { id: props.organization.id } },
      snapshots: undefined,
    } satisfies Prisma.erp_hrm_time_tracking_contractsCreateInput;
  }
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmContractCollector {
  export async function collect(props: {
    body: IHrmContract.ICreate;
    employee: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      start_date: props.body.start_date,
      end_date: props.body.end_date ?? null,
      pay_rate: props.body.pay_rate,
      pay_period: props.body.pay_period,
      working_hours_per_week: props.body.working_hours_per_week ?? null,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.employee.id } },
    } satisfies Prisma.hrm_contractsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmContractCollector {
//         export async function collect(props: {
//           body: IHrmContract.ICreate;
//           hrmEmployees: IEntity; // from path parameter employeeId
//           
//           
//         }) {
//           return {
//       id: ...,
//       start_date: ...,
//       end_date: ...,
//       pay_rate: ...,
//       pay_period: ...,
//       working_hours_per_week: ...,
//       notes: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       employee: ...,
//       snapshots: ...,
//           } satisfies Prisma.hrm_contractsCreateInput;
//         }
//       }
//--------------------------------------------------------------
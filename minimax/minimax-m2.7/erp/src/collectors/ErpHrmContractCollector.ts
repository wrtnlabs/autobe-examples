import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmContractCollector {
  export async function collect(props: {
    body: IErpHrmContract.ICreate;
    erpHrmEmployees: IEntity;
  }) {
    return {
      id: v4(),
      start_date: new Date(props.body.startDate),
      end_date: props.body.endDate ? new Date(props.body.endDate) : null,
      pay_rate: props.body.payRate,
      pay_period: props.body.payPeriod,
      working_hours_per_week: props.body.workingHoursPerWeek,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      employee: { connect: { id: props.erpHrmEmployees.id } },
    } satisfies Prisma.erp_hrm_contractsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmContractCollector {
//         export async function collect(props: {
//           body: IErpHrmContract.ICreate;
//           erpHrmEmployees: IEntity; // from path parameter employeeId
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
//       employee: ...,
//           } satisfies Prisma.erp_hrm_contractsCreateInput;
//         }
//       }
//--------------------------------------------------------------
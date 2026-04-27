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
    hrmTimeTrackingEmployees: IEntity;
  }) {
    return {
      id: v4(),
      start_date: props.body.startDate,
      end_date: props.body.endDate ?? null,
      pay_rate: props.body.payRate,
      pay_period: props.body.payPeriod,
      working_hours_per_week: props.body.workingHoursPerWeek,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.hrmTimeTrackingEmployees.id } },
    } satisfies Prisma.hrm_time_tracking_employee_contractsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmTimeTrackingEmployeeContractCollector {
//         export async function collect(props: {
//           body: IHrmTimeTrackingEmployeeContract.ICreate;
//           hrmTimeTrackingEmployees: IEntity; // from path parameter employeeId
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
//           } satisfies Prisma.hrm_time_tracking_employee_contractsCreateInput;
//         }
//       }
//--------------------------------------------------------------
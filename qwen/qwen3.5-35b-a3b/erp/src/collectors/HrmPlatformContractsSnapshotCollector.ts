import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContractsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractsSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformContractsSnapshotCollector {
  export async function collect(props: {
    body: IHrmPlatformContractsSnapshot.ICreate;
    hrmPlatformContracts: IEntity;
  }) {
    const id: string = v4();
    const contract =
      await MyGlobal.prisma.hrm_platform_contracts.findFirstOrThrow({
        where: { id: props.hrmPlatformContracts.id },
      });
    const employee =
      await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
        where: { id: contract.hrm_platform_employee_id },
      });
    return {
      id,
      contract_number: v4(),
      start_date: contract.start_date,
      end_date: contract.end_date ?? null,
      job_title: employee.job_title ?? "",
      department_id: employee.hrm_platform_department_id ?? null,
      compensation_amount: contract.compensation_amount ?? 0,
      compensation_currency: contract.compensation_currency ?? "USD",
      compensation_frequency: "monthly",
      benefits_description: contract.notes ?? null,
      probation_period_days: null,
      notice_period_days: null,
      work_location: null,
      work_type: "full-time",
      notes: contract.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      snapshotted_at: new Date(),
      contract: { connect: { id: props.hrmPlatformContracts.id } },
    } satisfies Prisma.hrm_platform_contracts_snapshotsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformContractsSnapshotCollector {
//         export async function collect(props: {
//           body: IHrmPlatformContractsSnapshot.ICreate;
//           hrmPlatformContracts: IEntity; // from path parameter contractId
//           
//           
//         }) {
//           return {
//       id: ...,
//       contract_number: ...,
//       start_date: ...,
//       end_date: ...,
//       job_title: ...,
//       department_id: ...,
//       compensation_amount: ...,
//       compensation_currency: ...,
//       compensation_frequency: ...,
//       benefits_description: ...,
//       probation_period_days: ...,
//       notice_period_days: ...,
//       work_location: ...,
//       work_type: ...,
//       notes: ...,
//       created_at: ...,
//       updated_at: ...,
//       snapshotted_at: ...,
//       contract: ...,
//           } satisfies Prisma.hrm_platform_contracts_snapshotsCreateInput;
//         }
//       }
//--------------------------------------------------------------
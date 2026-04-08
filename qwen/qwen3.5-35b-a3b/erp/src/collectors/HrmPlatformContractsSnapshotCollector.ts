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
    // Query contract to get all snapshot data
    const contract =
      await MyGlobal.prisma.hrm_platform_contracts.findFirstOrThrow({
        where: { id: props.hrmPlatformContracts.id },
        select: {
          id: true,
          title: true,
          start_date: true,
          end_date: true,
          compensation_amount: true,
          compensation_currency: true,
          notes: true,
          created_at: true,
          updated_at: true,
          hrm_platform_organization_id: true,
          hrm_platform_employee_id: true,
        },
      });
    return {
      id,
      contract_number: "CONTRACT-001",
      start_date: contract.start_date.toISOString(),
      end_date: contract.end_date?.toISOString() ?? null,
      job_title: contract.title,
      department_id: undefined,
      compensation_amount: contract.compensation_amount ?? 0,
      compensation_currency: contract.compensation_currency ?? "",
      compensation_frequency: "",
      benefits_description: null,
      probation_period_days: null,
      notice_period_days: null,
      work_location: null,
      work_type: "",
      notes: contract.notes ?? null,
      created_at: contract.created_at.toISOString(),
      updated_at: contract.updated_at.toISOString(),
      snapshotted_at: new Date().toISOString(),
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
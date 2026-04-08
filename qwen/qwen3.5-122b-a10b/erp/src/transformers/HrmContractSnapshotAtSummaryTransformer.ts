import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractSnapshot";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmContractSnapshotAtSummaryTransformer {
  export type Payload = Prisma.hrm_contract_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        employee_id: true,
        start_date: true,
        end_date: true,
        pay_rate: true,
        pay_period: true,
        working_hours_per_week: true,
        notes: true,
        created_at: true,
        hrmContract: {
          select: {
            employee: true,
          },
        },
      },
    } satisfies Prisma.hrm_contract_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmContractSnapshot.ISummary> {
    return {
      id: input.id,
      employee: {
        id: input.employee_id,
      } as IHrmEmployee.ISummary,
      start_date: toISOStringSafe(input.start_date),
      end_date: input.end_date ? toISOStringSafe(input.end_date) : null,
      pay_rate: Number(input.pay_rate),
      pay_period: input.pay_period,
      working_hours_per_week: input.working_hours_per_week ?? null,
      created_at: toISOStringSafe(input.created_at),
    } satisfies IHrmContractSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmContractSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.hrm_contract_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             start_date: true,
//             end_date: true,
//             pay_rate: true,
//             pay_period: true,
//             working_hours_per_week: true,
//             created_at: true,
//             ...
//           },
//         } satisfies Prisma.hrm_contract_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmContractSnapshot.ISummary> {
//         return {
//   id: {string},
//   employee: {IHrmEmployee.ISummary},
//   start_date: {string},
//   end_date: {string | null},
//   pay_rate: {number},
//   pay_period: {string},
//   working_hours_per_week: {number | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
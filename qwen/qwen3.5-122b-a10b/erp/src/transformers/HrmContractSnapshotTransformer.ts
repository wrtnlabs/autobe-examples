import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmContractSnapshotTransformer {
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
            id: true,
          },
        } satisfies Prisma.hrm_contractsFindManyArgs,
      },
    } satisfies Prisma.hrm_contract_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmContractSnapshot> {
    return {
      id: input.id,
      contractId: input.hrmContract.id,
      employeeId: input.employee_id,
      startDate: input.start_date.toISOString(),
      endDate: input.end_date?.toISOString() ?? null,
      payRate: Number(input.pay_rate),
      payPeriod: input.pay_period,
      workingHoursPerWeek: input.working_hours_per_week ?? null,
      notes: input.notes ?? null,
      createdAt: input.created_at.toISOString(),
    } satisfies IHrmContractSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmContractSnapshotTransformer {
//       export type Payload = Prisma.hrm_contract_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             employee_id: true,
//             start_date: true,
//             end_date: true,
//             pay_rate: true,
//             pay_period: true,
//             working_hours_per_week: true,
//             notes: true,
//             created_at: true,
//             hrm_contract_id: true,
//           },
//         } satisfies Prisma.hrm_contract_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmContractSnapshot> {
//         return {
//   id: {string},
//   contractId: {string},
//   employeeId: {string},
//   startDate: {string},
//   endDate: {string | null},
//   payRate: {number},
//   payPeriod: {string},
//   workingHoursPerWeek: {number | null},
//   notes: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
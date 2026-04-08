import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContractsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractsSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformContractsSnapshotAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_contracts_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        contract_number: true,
        start_date: true,
        end_date: true,
        job_title: true,
        department_id: true,
        compensation_amount: true,
        compensation_currency: true,
        compensation_frequency: true,
        benefits_description: true,
        probation_period_days: true,
        notice_period_days: true,
        work_location: true,
        work_type: true,
        notes: true,
        created_at: true,
        updated_at: true,
        snapshotted_at: true,
        contract: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.hrm_platform_contracts_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformContractsSnapshot.ISummary> {
    return {
      id: input.id,
      contract_number: input.contract_number,
      start_date: input.start_date.toISOString(),
      end_date: input.end_date?.toISOString() ?? null,
      job_title: input.job_title,
      department_id: input.department_id ?? null,
      compensation_amount: Number(input.compensation_amount),
      compensation_currency: input.compensation_currency,
      compensation_frequency: input.compensation_frequency,
      benefits_description: input.benefits_description ?? null,
      probation_period_days: input.probation_period_days ?? null,
      notice_period_days: input.notice_period_days ?? null,
      work_location: input.work_location ?? null,
      work_type: input.work_type,
      notes: input.notes ?? null,
      snapshotted_at: input.snapshotted_at.toISOString(),
    } satisfies IHrmPlatformContractsSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformContractsSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_contracts_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             contract_number: true,
//             start_date: true,
//             end_date: true,
//             job_title: true,
//             department_id: true,
//             compensation_amount: true,
//             compensation_currency: true,
//             compensation_frequency: true,
//             benefits_description: true,
//             probation_period_days: true,
//             notice_period_days: true,
//             work_location: true,
//             work_type: true,
//             notes: true,
//             created_at: true,
//             updated_at: true,
//             snapshotted_at: true,
//             hrm_platform_contract_id: true,
//           },
//         } satisfies Prisma.hrm_platform_contracts_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformContractsSnapshot.ISummary> {
//         return {
//   id: {string},
//   contract_number: {string},
//   start_date: {string},
//   end_date: {string | null},
//   job_title: {string},
//   department_id: {string | null},
//   compensation_amount: {number},
//   compensation_currency: {string},
//   compensation_frequency: {string},
//   benefits_description: {string | null},
//   probation_period_days: {integer | null},
//   notice_period_days: {integer | null},
//   work_location: {string | null},
//   work_type: {string},
//   notes: {string | null},
//   snapshotted_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
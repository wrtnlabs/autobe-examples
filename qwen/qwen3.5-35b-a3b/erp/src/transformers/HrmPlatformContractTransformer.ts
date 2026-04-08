import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformEmployeeAtSummaryTransformer } from "./HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

export namespace HrmPlatformContractTransformer {
  export type Payload = Prisma.hrm_platform_contractsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        start_date: true,
        end_date: true,
        compensation_amount: true,
        compensation_currency: true,
        status: true,
        notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        snapshot: {
          select: {},
        } satisfies Prisma.hrm_platform_contracts_snapshotsFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_contractsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformContract> {
    return {
      id: input.id,
      title: input.title,
      start_date: input.start_date.toISOString(),
      end_date: input.end_date?.toISOString() ?? null,
      compensation_amount: Number(input.compensation_amount) ?? null,
      compensation_currency: input.compensation_currency ?? null,
      status: input.status,
      notes: input.notes ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
    } satisfies IHrmPlatformContract;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformContractTransformer {
//       export type Payload = Prisma.hrm_platform_contractsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             title: true,
//             start_date: true,
//             end_date: true,
//             compensation_amount: true,
//             compensation_currency: true,
//             status: true,
//             notes: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
//             organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_contractsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformContract> {
//         return {
//   id: {string},
//   title: {string},
//   start_date: {string},
//   end_date: {string | null},
//   compensation_amount: {number | null},
//   compensation_currency: {string | null},
//   status: {string},
//   notes: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(input.employee),
//   organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(input.organization),
//         };
//       }
//     }
//--------------------------------------------------------------
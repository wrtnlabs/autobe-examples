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

export namespace HrmPlatformContractAtSummaryTransformer {
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
        organization: true,
        snapshot: true,
      },
    } satisfies Prisma.hrm_platform_contractsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformContract.ISummary> {
    return {
      id: input.id,
      title: input.title,
      start_date: input.start_date.toISOString(),
      end_date: input.end_date?.toISOString() ?? null,
      compensation_amount: input.compensation_amount ?? null,
      compensation_currency: input.compensation_currency ?? null,
      status: input.status,
      created_at: input.created_at.toISOString(),
      employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
    } satisfies IHrmPlatformContract.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformContractAtSummaryTransformer {
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
//             hrm_platform_organization_id: true,
//           },
//         } satisfies Prisma.hrm_platform_contractsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformContract.ISummary> {
//         return {
//   id: {string},
//   title: {string},
//   start_date: {string},
//   end_date: {string | null},
//   compensation_amount: {number | null},
//   compensation_currency: {string | null},
//   status: {string},
//   created_at: {string},
//   employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(input.employee),
//         };
//       }
//     }
//--------------------------------------------------------------
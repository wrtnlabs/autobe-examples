import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
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
import { HrmEmployeeAtSummaryTransformer } from "./HrmEmployeeAtSummaryTransformer";

export namespace HrmContractAtSummaryTransformer {
  export type Payload = Prisma.hrm_contractsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        start_date: true,
        end_date: true,
        pay_rate: true,
        pay_period: true,
        working_hours_per_week: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: HrmEmployeeAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_contractsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmContract.ISummary> {
    return {
      id: input.id,
      start_date: input.start_date.toISOString(),
      end_date: input.end_date?.toISOString() ?? null,
      pay_rate: input.pay_rate,
      pay_period: input.pay_period,
      working_hours_per_week: input.working_hours_per_week ?? null,
      employee: await HrmEmployeeAtSummaryTransformer.transform(input.employee),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmContract.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmContractAtSummaryTransformer {
//       export type Payload = Prisma.hrm_contractsGetPayload<ReturnType<typeof select>>;
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
//             notes: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             employee: HrmEmployeeAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_contractsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmContract.ISummary> {
//         return {
//   id: {string},
//   start_date: {string},
//   end_date: {string | null},
//   pay_rate: {number},
//   pay_period: {string},
//   working_hours_per_week: {number | null},
//   employee: await HrmEmployeeAtSummaryTransformer.transform(input.employee),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
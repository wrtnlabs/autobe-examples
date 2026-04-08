import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";

export namespace ErpHrmContractAtResponseTransformer {
  export type Payload = Prisma.erp_hrm_contractsGetPayload<
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
        notes: true,
        created_at: true,
        updated_at: true,
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_contractsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmContract.IResponse> {
    return {
      id: input.id,
      start_date: input.start_date.toISOString(),
      end_date: input.end_date?.toISOString() ?? null,
      pay_rate: input.pay_rate,
      pay_period: input.pay_period,
      working_hours_per_week: input.working_hours_per_week,
      notes: input.notes ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
    } satisfies IErpHrmContract.IResponse;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmContractAtResponseTransformer {
//       export type Payload = Prisma.erp_hrm_contractsGetPayload<ReturnType<typeof select>>;
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
//             employee: ErpHrmEmployeeAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_contractsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmContract.IResponse> {
//         return {
//   id: {string},
//   start_date: {string},
//   end_date: {string | null},
//   pay_rate: {number},
//   pay_period: {string},
//   working_hours_per_week: {number},
//   notes: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   employee: await ErpHrmEmployeeAtSummaryTransformer.transform(input.employee),
//         };
//       }
//     }
//--------------------------------------------------------------
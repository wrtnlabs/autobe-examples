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

export namespace ErpHrmContractTransformer {
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
  export async function transform(input: Payload): Promise<IErpHrmContract> {
    return {
      id: input.id,
      startDate: input.start_date.toISOString(),
      endDate: input.end_date?.toISOString() ?? null,
      payRate: input.pay_rate,
      payPeriod: input.pay_period,
      workingHoursPerWeek: input.working_hours_per_week,
      notes: input.notes ?? undefined,
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IErpHrmContract;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmContractTransformer {
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
//       export async function transform(input: Payload): Promise<IErpHrmContract> {
//         return {
//   id: {string},
//   startDate: {string},
//   endDate: {string | null},
//   payRate: {number},
//   payPeriod: {string},
//   workingHoursPerWeek: {number},
//   notes: {string | null},
//   employee: await ErpHrmEmployeeAtSummaryTransformer.transform(input.employee),
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
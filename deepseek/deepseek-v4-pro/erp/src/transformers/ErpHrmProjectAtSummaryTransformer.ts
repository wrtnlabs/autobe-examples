import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmProjectAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        color_code: true,
        status: true,
      },
    } satisfies Prisma.erp_hrm_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmProject.ISummary> {
    return {
      id: input.id,
      name: input.name,
      color_code: input.color_code,
      status: input.status,
      description: input.description,
    } satisfies IErpHrmProject.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmProjectAtSummaryTransformer {
//       export type Payload = Prisma.erp_hrm_projectsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             organization_id: true,
//             name: true,
//             description: true,
//             color_code: true,
//             status: true,
//             budget_hours: true,
//             start_date: true,
//             end_date: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.erp_hrm_projectsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmProject.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   color_code: {string},
//   status: {string},
//   description: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
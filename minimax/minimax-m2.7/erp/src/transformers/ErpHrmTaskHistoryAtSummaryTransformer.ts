import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";

export namespace ErpHrmTaskHistoryAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_task_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        previous_status: true,
        new_status: true,
        created_at: true,
        task: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_tasksFindManyArgs,
        member: ErpHrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_task_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTaskHistory.ISummary> {
    return {
      id: input.id,
      previousStatus: input.previous_status,
      newStatus: input.new_status,
      createdAt: input.created_at.toISOString(),
      member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
    } satisfies IErpHrmTaskHistory.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmTaskHistoryAtSummaryTransformer {
//       export type Payload = Prisma.erp_hrm_task_historiesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             previous_status: true,
//             new_status: true,
//             created_at: true,
//             erp_hrm_task_id: true,
//             member: ErpHrmMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_task_historiesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmTaskHistory.ISummary> {
//         return {
//   id: {string},
//   previousStatus: {string},
//   newStatus: {string},
//   createdAt: {string},
//   member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
//         };
//       }
//     }
//--------------------------------------------------------------
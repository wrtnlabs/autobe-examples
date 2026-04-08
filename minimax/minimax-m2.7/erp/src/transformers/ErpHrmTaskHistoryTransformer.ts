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

export namespace ErpHrmTaskHistoryTransformer {
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
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_tasksFindManyArgs,
        member: ErpHrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_task_historiesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTaskHistory> {
    return {
      id: input.id,
      task_id: input.task.id,
      member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
      previous_status: input.previous_status,
      new_status: input.new_status,
      created_at: input.created_at.toISOString(),
    } satisfies IErpHrmTaskHistory;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmTaskHistoryTransformer {
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
//       export async function transform(input: Payload): Promise<IErpHrmTaskHistory> {
//         return {
//   id: {string},
//   task_id: {string},
//   member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
//   previous_status: {string},
//   new_status: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
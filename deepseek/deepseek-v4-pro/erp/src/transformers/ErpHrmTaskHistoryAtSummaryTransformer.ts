import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
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
        old_status: true,
        new_status: true,
        created_at: true,
        task: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_tasksFindManyArgs,
        changedByMember: ErpHrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_task_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTaskHistory.ISummary> {
    return {
      id: input.id,
      old_status: input.old_status,
      new_status: input.new_status,
      changed_by_member: await ErpHrmMemberAtSummaryTransformer.transform(
        input.changedByMember,
      ),
      created_at: input.created_at.toISOString(),
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
//             old_status: true,
//             new_status: true,
//             created_at: true,
//             erp_hrm_task_id: true,
//             changedByMember: ErpHrmMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_task_historiesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmTaskHistory.ISummary> {
//         return {
//   id: {string},
//   old_status: {string},
//   new_status: {string},
//   changed_by_member: await ErpHrmMemberAtSummaryTransformer.transform(input.changedByMember),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
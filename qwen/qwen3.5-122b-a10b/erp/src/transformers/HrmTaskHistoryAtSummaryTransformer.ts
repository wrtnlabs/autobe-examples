import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmMemberAtSummaryTransformer } from "./HrmMemberAtSummaryTransformer";

export namespace HrmTaskHistoryAtSummaryTransformer {
  export type Payload = Prisma.hrm_task_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        timestamp: true,
        old_status: true,
        new_status: true,
        created_at: true,
        updated_at: true,
        member: HrmMemberAtSummaryTransformer.select(),
        task: { select: { id: true } } satisfies Prisma.hrm_tasksFindManyArgs,
      },
    } satisfies Prisma.hrm_task_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTaskHistory.ISummary> {
    return {
      id: input.id,
      timestamp: input.timestamp.toISOString(),
      old_status: input.old_status,
      new_status: input.new_status,
      member: await HrmMemberAtSummaryTransformer.transform(input.member),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IHrmTaskHistory.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTaskHistoryAtSummaryTransformer {
//       export type Payload = Prisma.hrm_task_historiesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             timestamp: true,
//             old_status: true,
//             new_status: true,
//             created_at: true,
//             updated_at: true,
//             hrm_task_id: true,
//             member: HrmMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_task_historiesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTaskHistory.ISummary> {
//         return {
//   id: {string},
//   timestamp: {string},
//   old_status: {string},
//   new_status: {string},
//   member: await HrmMemberAtSummaryTransformer.transform(input.member),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
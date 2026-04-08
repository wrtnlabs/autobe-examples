import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActivityLog";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmMemberAtSummaryTransformer } from "./HrmMemberAtSummaryTransformer";

export namespace HrmActivityLogAtSummaryTransformer {
  export type Payload = Prisma.hrm_activity_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        timestamp: true,
        action_type: true,
        target_entity_type: true,
        target_entity_id: true,
        details: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        hrmMember: HrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmActivityLog.ISummary> {
    return {
      id: input.id,
      timestamp: input.timestamp.toISOString(),
      action_type: input.action_type,
      target_entity_type: input.target_entity_type,
      target_entity_id: input.target_entity_id ?? null,
      details: input.details ?? null,
      performer: await HrmMemberAtSummaryTransformer.transform(input.hrmMember),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmActivityLog.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmActivityLogAtSummaryTransformer {
//       export type Payload = Prisma.hrm_activity_logsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             timestamp: true,
//             action_type: true,
//             target_entity_type: true,
//             target_entity_id: true,
//             details: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             hrmMember: HrmMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_activity_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmActivityLog.ISummary> {
//         return {
//   id: {string},
//   timestamp: {string},
//   action_type: {string},
//   target_entity_type: {string},
//   target_entity_id: {string | null},
//   details: {string | null},
//   performer: await HrmMemberAtSummaryTransformer.transform(input.hrmMember),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
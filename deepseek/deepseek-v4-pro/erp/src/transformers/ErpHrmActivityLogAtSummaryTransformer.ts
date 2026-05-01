import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";

export namespace ErpHrmActivityLogAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_activity_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        organization_id: true,
        action_type: true,
        target_entity: true,
        target_id: true,
        details: true,
        created_at: true,
        user: ErpHrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmActivityLog.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      target_entity: input.target_entity,
      target_id: input.target_id,
      details: input.details,
      user: await ErpHrmMemberAtSummaryTransformer.transform(input.user),
      created_at: input.created_at.toISOString(),
    } satisfies IErpHrmActivityLog.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmActivityLogAtSummaryTransformer {
//       export type Payload = Prisma.erp_hrm_activity_logsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             organization_id: true,
//             action_type: true,
//             target_entity: true,
//             target_id: true,
//             details: true,
//             created_at: true,
//             user: ErpHrmMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_activity_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmActivityLog.ISummary> {
//         return {
//   id: {string},
//   action_type: {string},
//   target_entity: {string},
//   target_id: {string},
//   details: {string | null},
//   user: await ErpHrmMemberAtSummaryTransformer.transform(input.user),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
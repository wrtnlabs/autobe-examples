import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
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
        action_type: true,
        target_entity_type: true,
        target_entity_id: true,
        details: true,
        created_at: true,
        organization: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_organizationsFindManyArgs,
        member: ErpHrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmActivityLog.ISummary> {
    return {
      id: input.id,
      actionType: input.action_type,
      targetEntityType: input.target_entity_type,
      targetEntityId: input.target_entity_id,
      details: input.details ?? null,
      createdAt: input.created_at.toISOString(),
      member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
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
//             action_type: true,
//             target_entity_type: true,
//             target_entity_id: true,
//             details: true,
//             created_at: true,
//             erp_hrm_organization_id: true,
//             member: ErpHrmMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_activity_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmActivityLog.ISummary> {
//         return {
//   id: {string},
//   actionType: {string},
//   targetEntityType: {string},
//   targetEntityId: {string},
//   details: {null | string},
//   createdAt: {string},
//   member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
//         };
//       }
//     }
//--------------------------------------------------------------
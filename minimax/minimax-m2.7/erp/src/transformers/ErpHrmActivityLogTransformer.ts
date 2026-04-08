import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";

export namespace ErpHrmActivityLogTransformer {
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
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
        member: ErpHrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_activity_logsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmActivityLog> {
    return {
      id: input.id,
      actionType: input.action_type,
      targetEntityType: input.target_entity_type,
      targetEntityId: input.target_entity_id,
      details: input.details ?? undefined,
      createdAt: input.created_at.toISOString(),
      member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
    } satisfies IErpHrmActivityLog;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmActivityLogTransformer {
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
//             organization: ErpHrmOrganizationAtSummaryTransformer.select(),
//             member: ErpHrmMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_activity_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmActivityLog> {
//         return {
//   id: {string},
//   actionType: {string},
//   targetEntityType: {string},
//   targetEntityId: {string},
//   details: {string | null},
//   createdAt: {string},
//   member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
//   organization: await ErpHrmOrganizationAtSummaryTransformer.transform(input.organization),
//         };
//       }
//     }
//--------------------------------------------------------------
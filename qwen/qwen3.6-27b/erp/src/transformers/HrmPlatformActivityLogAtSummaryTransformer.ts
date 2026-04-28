import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import { IHrmPlatformActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogDetail";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformActivityLogDetailTransformer } from "./HrmPlatformActivityLogDetailTransformer";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";

export namespace HrmPlatformActivityLogAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_activity_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        entity_type: true,
        entity_id: true,
        entity_name: true,
        created_at: true,
        member: HrmPlatformMemberAtSummaryTransformer.select(),
        activityLogDetails: HrmPlatformActivityLogDetailTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformActivityLog.ISummary> {
    return {
      id: input.id,
      actionType: input.action_type,
      entityType: input.entity_type,
      entityId: input.entity_id,
      entityName: input.entity_name ?? null,
      createdAt: input.created_at.toISOString(),
      member: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      details: await ArrayUtil.asyncMap(
        input.activityLogDetails,
        HrmPlatformActivityLogDetailTransformer.transform,
      ),
    } satisfies IHrmPlatformActivityLog.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformActivityLogAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_activity_logsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             action_type: true,
//             entity_type: true,
//             entity_id: true,
//             entity_name: true,
//             created_at: true,
//             hrm_platform_organization_id: true,
//             member: HrmPlatformMemberAtSummaryTransformer.select(),
//             activityLogDetails: HrmPlatformActivityLogDetailTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_activity_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformActivityLog.ISummary> {
//         return {
//   id: {string},
//   actionType: {string},
//   entityType: {string},
//   entityId: {string},
//   entityName: {string | null},
//   createdAt: {string},
//   member: await HrmPlatformMemberAtSummaryTransformer.transform(input.member),
//   details: await ArrayUtil.asyncMap(input.activityLogDetails, HrmPlatformActivityLogDetailTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------
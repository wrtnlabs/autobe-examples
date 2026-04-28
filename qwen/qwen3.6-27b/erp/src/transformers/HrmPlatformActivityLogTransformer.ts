import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import { IHrmPlatformActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogDetail";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformActivityLogDetailTransformer } from "./HrmPlatformActivityLogDetailTransformer";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

export namespace HrmPlatformActivityLogTransformer {
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
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        member: HrmPlatformMemberAtSummaryTransformer.select(),
        activityLogDetails: HrmPlatformActivityLogDetailTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformActivityLog> {
    return {
      id: input.id,
      actionType: input.action_type,
      entityType: input.entity_type,
      entityId: input.entity_id,
      entityName: input.entity_name,
      createdAt: input.created_at.toISOString(),
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      member: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      activityLogDetails: await ArrayUtil.asyncMap(
        input.activityLogDetails,
        HrmPlatformActivityLogDetailTransformer.transform,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformActivityLogTransformer {
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
//             organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
//             member: HrmPlatformMemberAtSummaryTransformer.select(),
//             activityLogDetails: HrmPlatformActivityLogDetailTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_activity_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformActivityLog> {
//         return {
//   actionType: {string},
//   activityLogDetails: await ArrayUtil.asyncMap(input.activityLogDetails, HrmPlatformActivityLogDetailTransformer.transform),
//   createdAt: {string},
//   entityId: {string},
//   entityName: {string | null},
//   entityType: {string},
//   id: {string},
//   member: await HrmPlatformMemberAtSummaryTransformer.transform(input.member),
//   organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(input.organization),
//         };
//       }
//     }
//--------------------------------------------------------------
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLog";
import { IHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLogType";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingActivityLogTypeAtSummaryTransformer } from "./HrmTimeTrackingActivityLogTypeAtSummaryTransformer";
import { HrmTimeTrackingMemberAtSummaryTransformer } from "./HrmTimeTrackingMemberAtSummaryTransformer";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";

export namespace HrmTimeTrackingActivityLogTransformer {
  export type Payload = Prisma.hrm_time_tracking_activity_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_entity_type: true,
        target_entity_id: true,
        target_entity_name: true,
        details: true,
        created_at: true,
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        member: HrmTimeTrackingMemberAtSummaryTransformer.select(),
        activityLogType:
          HrmTimeTrackingActivityLogTypeAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingActivityLog> {
    return {
      id: input.id,
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      member: await HrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.member,
      ),
      activityLogType:
        await HrmTimeTrackingActivityLogTypeAtSummaryTransformer.transform(
          input.activityLogType,
        ),
      targetEntityType: input.target_entity_type,
      targetEntityId: input.target_entity_id,
      targetEntityName: input.target_entity_name,
      details: input.details ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingActivityLogTransformer {
//       export type Payload = Prisma.hrm_time_tracking_activity_logsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             target_entity_type: true,
//             target_entity_id: true,
//             target_entity_name: true,
//             details: true,
//             created_at: true,
//             organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
//             member: HrmTimeTrackingMemberAtSummaryTransformer.select(),
//             activityLogType: HrmTimeTrackingActivityLogTypeAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_activity_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingActivityLog> {
//         return {
//   id: {string},
//   organization: await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(input.organization),
//   member: await HrmTimeTrackingMemberAtSummaryTransformer.transform(input.member),
//   activityLogType: await HrmTimeTrackingActivityLogTypeAtSummaryTransformer.transform(input.activityLogType),
//   targetEntityType: {string},
//   targetEntityId: {string},
//   targetEntityName: {string},
//   details: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
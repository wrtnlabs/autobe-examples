import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLog";
import { IHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLogType";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingActivityLogTypeAtSummaryTransformer } from "./HrmTimeTrackingActivityLogTypeAtSummaryTransformer";
import { HrmTimeTrackingMemberAtSummaryTransformer } from "./HrmTimeTrackingMemberAtSummaryTransformer";

export namespace HrmTimeTrackingActivityLogAtSummaryTransformer {
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
        member: HrmTimeTrackingMemberAtSummaryTransformer.select(),
        activityLogType:
          HrmTimeTrackingActivityLogTypeAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingActivityLog.ISummary> {
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      actor: await HrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.member,
      ),
      activityLogType:
        await HrmTimeTrackingActivityLogTypeAtSummaryTransformer.transform(
          input.activityLogType,
        ),
      targetEntityType: input.target_entity_type,
      targetEntityId: input.target_entity_id,
      targetEntityName: input.target_entity_name,
      details: input.details,
    } satisfies IHrmTimeTrackingActivityLog.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingActivityLogAtSummaryTransformer {
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
//             hrm_time_tracking_organization_id: true,
//             member: HrmTimeTrackingMemberAtSummaryTransformer.select(),
//             activityLogType: HrmTimeTrackingActivityLogTypeAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_activity_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingActivityLog.ISummary> {
//         return {
//   id: {string},
//   createdAt: {string},
//   actor: await HrmTimeTrackingMemberAtSummaryTransformer.transform(input.member),
//   activityLogType: await HrmTimeTrackingActivityLogTypeAtSummaryTransformer.transform(input.activityLogType),
//   targetEntityType: {string},
//   targetEntityId: {string},
//   targetEntityName: {string},
//   details: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
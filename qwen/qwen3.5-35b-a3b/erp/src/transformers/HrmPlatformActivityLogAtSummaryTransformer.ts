import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformActivityLogAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_activity_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        entity_type: true,
        entity_id: true,
        action_type: true,
        action_name: true,
        extra_data: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
          },
        },
        organization: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.hrm_platform_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformActivityLog.ISummary> {
    return {
      id: input.id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      action_name: input.action_name,
      action_type: input.action_type,
      member_id: input.member?.id ?? null,
      organization_id: input.organization.id,
      created_at: input.created_at.toISOString(),
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
//             entity_type: true,
//             entity_id: true,
//             action_type: true,
//             action_name: true,
//             extra_data: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member_id: true,
//             organization_id: true,
//           },
//         } satisfies Prisma.hrm_platform_activity_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformActivityLog.ISummary> {
//         return {
//   id: {string},
//   entity_type: {string},
//   entity_id: {string},
//   action_name: {string},
//   action_type: {string},
//   member_id: {string | null},
//   organization_id: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
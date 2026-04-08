import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
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
        entity_type: true,
        entity_id: true,
        action_type: true,
        action_name: true,
        extra_data: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: HrmPlatformMemberAtSummaryTransformer.select(),
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformActivityLog> {
    return {
      id: input.id,
      member: input.member
        ? await HrmPlatformMemberAtSummaryTransformer.transform(input.member)
        : null,
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      action_type: input.action_type,
      action_name: input.action_name,
      extra_data: input.extra_data ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmPlatformActivityLog;
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
//             entity_type: true,
//             entity_id: true,
//             action_type: true,
//             action_name: true,
//             extra_data: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: HrmPlatformMemberAtSummaryTransformer.select(),
//             organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_activity_logsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformActivityLog> {
//         return {
//   id: {string},
//   member: input.member ? await HrmPlatformMemberAtSummaryTransformer.transform(input.member) : null,
//   organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(input.organization),
//   entity_type: {string},
//   entity_id: {string},
//   action_type: {string},
//   action_name: {string},
//   extra_data: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
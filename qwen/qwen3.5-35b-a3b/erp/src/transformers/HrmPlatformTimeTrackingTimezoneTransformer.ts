import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformTimeTrackingTimezone } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeTrackingTimezone";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

export namespace HrmPlatformTimeTrackingTimezoneTransformer {
  export type Payload = Prisma.hrm_platform_time_tracking_timezonesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        timezone: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_time_tracking_timezonesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTimeTrackingTimezone> {
    return {
      id: input.id,
      organization_id: input.organization.id,
      timezone: input.timezone,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
    } satisfies IHrmPlatformTimeTrackingTimezone;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformTimeTrackingTimezoneTransformer {
//       export type Payload = Prisma.hrm_platform_time_tracking_timezonesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             timezone: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_time_tracking_timezonesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformTimeTrackingTimezone> {
//         return {
//   id: {string},
//   organization_id: {string},
//   timezone: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(input.organization),
//         };
//       }
//     }
//--------------------------------------------------------------
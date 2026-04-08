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

export namespace HrmPlatformTimeTrackingTimezoneAtSummaryTransformer {
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
  ): Promise<IHrmPlatformTimeTrackingTimezone.ISummary> {
    return {
      id: input.id,
      timezone: input.timezone,
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmPlatformTimeTrackingTimezone.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformTimeTrackingTimezoneAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IHrmPlatformTimeTrackingTimezone.ISummary> {
//         return {
//   id: {string},
//   timezone: {string},
//   organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(input.organization),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
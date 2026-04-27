import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingMemberAtSummaryTransformer } from "./HrmTimeTrackingMemberAtSummaryTransformer";

export namespace HrmTimeTrackingOrganizationSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.hrm_time_tracking_organization_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo_uri: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        owner_member_id: true,
        owner_display_name: true,
        status: true,
        event_type: true,
        event_details: true,
        created_at: true,
        actor: HrmTimeTrackingMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_organization_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingOrganizationSnapshot.ISummary> {
    return {
      id: input.id,
      event_type: input.event_type,
      event_details: input.event_details ?? null,
      created_at: input.created_at.toISOString(),
      actor: await HrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.actor,
      ),
      name: input.name,
      description: input.description ?? null,
      logo_uri: input.logo_uri ?? null,
      currency: input.currency,
      timezone: input.timezone,
      fiscal_start_month: input.fiscal_start_month,
      owner_member_id: input.owner_member_id,
      owner_display_name: input.owner_display_name,
      status: input.status,
    } satisfies IHrmTimeTrackingOrganizationSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingOrganizationSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.hrm_time_tracking_organization_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             logo_uri: true,
//             currency: true,
//             timezone: true,
//             fiscal_start_month: true,
//             owner_member_id: true,
//             owner_display_name: true,
//             status: true,
//             event_type: true,
//             event_details: true,
//             created_at: true,
//             hrm_time_tracking_organization_id: true,
//             actor: HrmTimeTrackingMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_organization_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingOrganizationSnapshot.ISummary> {
//         return {
//   id: {string},
//   event_type: {string},
//   event_details: {string | null},
//   created_at: {string},
//   actor: await HrmTimeTrackingMemberAtSummaryTransformer.transform(input.actor),
//   name: {string},
//   description: {string | null},
//   logo_uri: {string | null},
//   currency: {string},
//   timezone: {string},
//   fiscal_start_month: {integer},
//   owner_member_id: {string},
//   owner_display_name: {string},
//   status: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
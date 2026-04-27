import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingMemberAtSummaryTransformer } from "./HrmTimeTrackingMemberAtSummaryTransformer";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";

export namespace HrmTimeTrackingOrganizationSnapshotTransformer {
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
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        actor: HrmTimeTrackingMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_organization_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingOrganizationSnapshot> {
    return {
      id: input.id,
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
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
      event_type: input.event_type,
      event_details: input.event_details ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingOrganizationSnapshotTransformer {
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
//             organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
//             actor: HrmTimeTrackingMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_organization_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingOrganizationSnapshot> {
//         return {
//   id: {string},
//   organization: await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(input.organization),
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
//   event_type: {string},
//   event_details: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
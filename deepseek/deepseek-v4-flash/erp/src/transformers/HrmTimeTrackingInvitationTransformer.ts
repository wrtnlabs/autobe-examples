import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingMemberAtSummaryTransformer } from "./HrmTimeTrackingMemberAtSummaryTransformer";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";
import { HrmTimeTrackingRoleAtSummaryTransformer } from "./HrmTimeTrackingRoleAtSummaryTransformer";

export namespace HrmTimeTrackingInvitationTransformer {
  export type Payload = Prisma.hrm_time_tracking_invitationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        status: true,
        expired_at: true,
        accepted_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        inviter: HrmTimeTrackingMemberAtSummaryTransformer.select(),
        acceptor: HrmTimeTrackingMemberAtSummaryTransformer.select(),
        role: HrmTimeTrackingRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_invitationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingInvitation> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      expired_at: input.expired_at?.toISOString() ?? undefined,
      accepted_at: input.accepted_at?.toISOString() ?? undefined,
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      inviter: await HrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.inviter,
      ),
      acceptor: input.acceptor
        ? await HrmTimeTrackingMemberAtSummaryTransformer.transform(
            input.acceptor,
          )
        : undefined,
      role: await HrmTimeTrackingRoleAtSummaryTransformer.transform(input.role),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? undefined,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingInvitationTransformer {
//       export type Payload = Prisma.hrm_time_tracking_invitationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             status: true,
//             expired_at: true,
//             accepted_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
//             hrm_time_tracking_member_inviter_id: true,
//             hrm_time_tracking_member_acceptor_id: true,
//             role: HrmTimeTrackingRoleAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.hrm_time_tracking_invitationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingInvitation> {
//         return {
//   id: {string},
//   email: {string},
//   status: {string},
//   expired_at: {string | null},
//   accepted_at: {string | null},
//   organization: await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(input.organization),
//   inviter: {IHrmTimeTrackingMember.ISummary},
//   acceptor: {IHrmTimeTrackingMember.ISummary | null},
//   role: await HrmTimeTrackingRoleAtSummaryTransformer.transform(input.role),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
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
import { HrmTimeTrackingRoleAtSummaryTransformer } from "./HrmTimeTrackingRoleAtSummaryTransformer";

export namespace HrmTimeTrackingInvitationAtSummaryTransformer {
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
        inviter: HrmTimeTrackingMemberAtSummaryTransformer.select(),
        role: HrmTimeTrackingRoleAtSummaryTransformer.select(),
        acceptor: HrmTimeTrackingMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_invitationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingInvitation.ISummary> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      expired_at: input.expired_at?.toISOString() ?? null,
      accepted_at: input.accepted_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      inviter: await HrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.inviter,
      ),
      role: await HrmTimeTrackingRoleAtSummaryTransformer.transform(input.role),
      acceptor:
        input.acceptor !== null
          ? await HrmTimeTrackingMemberAtSummaryTransformer.transform(
              input.acceptor,
            )
          : null,
    } satisfies IHrmTimeTrackingInvitation.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingInvitationAtSummaryTransformer {
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
//             hrm_time_tracking_organization_id: true,
//             hrm_time_tracking_member_inviter_id: true,
//             hrm_time_tracking_member_acceptor_id: true,
//             role: HrmTimeTrackingRoleAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.hrm_time_tracking_invitationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingInvitation.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   status: {string},
//   expired_at: {string | null},
//   accepted_at: {string | null},
//   created_at: {string},
//   inviter: {IHrmTimeTrackingMember.ISummary},
//   role: await HrmTimeTrackingRoleAtSummaryTransformer.transform(input.role),
//   acceptor: {IHrmTimeTrackingMember.ISummary | null},
//         };
//       }
//     }
//--------------------------------------------------------------
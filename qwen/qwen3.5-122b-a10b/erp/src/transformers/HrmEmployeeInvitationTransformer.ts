import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmMemberAtSummaryTransformer } from "./HrmMemberAtSummaryTransformer";
import { HrmOrganizationAtSummaryTransformer } from "./HrmOrganizationAtSummaryTransformer";
import { HrmRoleAtSummaryTransformer } from "./HrmRoleAtSummaryTransformer";

export namespace HrmEmployeeInvitationTransformer {
  export type Payload = Prisma.hrm_employee_invitationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        status: true,
        token: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmOrganizationAtSummaryTransformer.select(),
        role: HrmRoleAtSummaryTransformer.select(),
        inviter: HrmMemberAtSummaryTransformer.select(),
        member: HrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_employee_invitationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmEmployeeInvitation> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      token: input.token,
      expires_at: input.expires_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      organization: await HrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      role: await HrmRoleAtSummaryTransformer.transform(input.role),
      inviter: await HrmMemberAtSummaryTransformer.transform(input.inviter),
      member: input.member
        ? await HrmMemberAtSummaryTransformer.transform(input.member)
        : undefined,
    } satisfies IHrmEmployeeInvitation;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmEmployeeInvitationTransformer {
//       export type Payload = Prisma.hrm_employee_invitationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             status: true,
//             token: true,
//             expires_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization: HrmOrganizationAtSummaryTransformer.select(),
//             role: HrmRoleAtSummaryTransformer.select(),
//             invited_by_id: true,
//             member_id: true,
//             ...
//           },
//         } satisfies Prisma.hrm_employee_invitationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmEmployeeInvitation> {
//         return {
//   id: {string},
//   email: {string},
//   status: {string},
//   token: {string},
//   expires_at: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   organization: await HrmOrganizationAtSummaryTransformer.transform(input.organization),
//   role: await HrmRoleAtSummaryTransformer.transform(input.role),
//   inviter: {IHrmMember.ISummary},
//   member: {IHrmMember.ISummary | null},
//         };
//       }
//     }
//--------------------------------------------------------------
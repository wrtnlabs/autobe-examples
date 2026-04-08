import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmDepartmentAtSummaryTransformer } from "./ErpHrmDepartmentAtSummaryTransformer";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";
import { ErpHrmRoleAtSummaryTransformer } from "./ErpHrmRoleAtSummaryTransformer";

export namespace ErpHrmInvitationAtResendResponseTransformer {
  export type Payload = Prisma.erp_hrm_invitationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        status: true,
        token: true,
        position: true,
        note: true,
        accepted_at: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
        role: ErpHrmRoleAtSummaryTransformer.select(),
        department: ErpHrmDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_invitationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmInvitation.IResendResponse> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      token: input.token,
      position: input.position,
      note: input.note,
      acceptedAt: input.accepted_at?.toISOString() ?? null,
      expiresAt: input.expires_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      role: input.role
        ? await ErpHrmRoleAtSummaryTransformer.transform(input.role)
        : null,
      department: input.department
        ? await ErpHrmDepartmentAtSummaryTransformer.transform(input.department)
        : null,
    } satisfies IErpHrmInvitation.IResendResponse;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmInvitationAtResendResponseTransformer {
//       export type Payload = Prisma.erp_hrm_invitationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             status: true,
//             token: true,
//             position: true,
//             note: true,
//             accepted_at: true,
//             expires_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization: ErpHrmOrganizationAtSummaryTransformer.select(),
//             role: ErpHrmRoleAtSummaryTransformer.select(),
//             department: ErpHrmDepartmentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_invitationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmInvitation.IResendResponse> {
//         return {
//   id: {string},
//   email: {string},
//   status: {string},
//   token: {string | null},
//   position: {string | null},
//   note: {string | null},
//   acceptedAt: {string | null},
//   expiresAt: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   organization: await ErpHrmOrganizationAtSummaryTransformer.transform(input.organization),
//   role: input.role ? await ErpHrmRoleAtSummaryTransformer.transform(input.role) : null,
//   department: input.department ? await ErpHrmDepartmentAtSummaryTransformer.transform(input.department) : null,
//         };
//       }
//     }
//--------------------------------------------------------------
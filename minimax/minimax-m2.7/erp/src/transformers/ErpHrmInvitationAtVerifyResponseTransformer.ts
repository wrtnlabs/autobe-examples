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

export namespace ErpHrmInvitationAtVerifyResponseTransformer {
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
  ): Promise<IErpHrmInvitation.IVerifyResponse> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      position: input.position ?? null,
      note: input.note ?? null,
      expiresAt: input.expires_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      role: input.role
        ? await ErpHrmRoleAtSummaryTransformer.transform(input.role)
        : null,
      department: input.department
        ? await ErpHrmDepartmentAtSummaryTransformer.transform(input.department)
        : null,
    } satisfies IErpHrmInvitation.IVerifyResponse;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmInvitationAtVerifyResponseTransformer {
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
//       export async function transform(input: Payload): Promise<IErpHrmInvitation.IVerifyResponse> {
//         return {
//   id: {string},
//   email: {string},
//   status: {string},
//   position: {string | null},
//   note: {string | null},
//   expiresAt: {string | null},
//   createdAt: {string},
//   organization: await ErpHrmOrganizationAtSummaryTransformer.transform(input.organization),
//   role: input.role ? await ErpHrmRoleAtSummaryTransformer.transform(input.role) : null,
//   department: input.department ? await ErpHrmDepartmentAtSummaryTransformer.transform(input.department) : null,
//         };
//       }
//     }
//--------------------------------------------------------------
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
import { ErpHrmRoleAtSummaryTransformer } from "./ErpHrmRoleAtSummaryTransformer";

export namespace ErpHrmInvitationAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_invitationsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmInvitation.ISummary> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      created_at: input.created_at.toISOString(),
      role: input.role
        ? await ErpHrmRoleAtSummaryTransformer.transform(input.role)
        : null,
      department: input.department
        ? await ErpHrmDepartmentAtSummaryTransformer.transform(input.department)
        : undefined,
      accepted_at: input.accepted_at?.toISOString() ?? null,
      expires_at: input.expires_at?.toISOString() ?? null,
      position: input.position ?? null,
      note: input.note ?? null,
    } satisfies IErpHrmInvitation.ISummary;
  }
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
        organization: {
          select: {
            id: true,
          },
        },
        role: ErpHrmRoleAtSummaryTransformer.select(),
        department: ErpHrmDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_invitationsFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmInvitationAtSummaryTransformer {
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
//             erp_hrm_organization_id: true,
//             role: ErpHrmRoleAtSummaryTransformer.select(),
//             department: ErpHrmDepartmentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_invitationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmInvitation.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   status: {string},
//   created_at: {string},
//   role: input.role ? await ErpHrmRoleAtSummaryTransformer.transform(input.role) : null,
//   department: input.department ? await ErpHrmDepartmentAtSummaryTransformer.transform(input.department) : null,
//   accepted_at: {string | null},
//   expires_at: {string | null},
//   position: {string | null},
//   note: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
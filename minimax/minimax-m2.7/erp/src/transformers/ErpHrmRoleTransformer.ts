import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";
import { ErpHrmRolePermissionTransformer } from "./ErpHrmRolePermissionTransformer";

export namespace ErpHrmRoleTransformer {
  export type Payload = Prisma.erp_hrm_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        is_builtin: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
        rolePermissions: ErpHrmRolePermissionTransformer.select(),
        employees: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_employeesFindManyArgs,
        invitations: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_invitationsFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_rolesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmRole> {
    return {
      id: input.id,
      name: input.name,
      isBuiltin: input.is_builtin,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      rolePermissions: await ArrayUtil.asyncMap(
        input.rolePermissions,
        ErpHrmRolePermissionTransformer.transform,
      ),
    } satisfies IErpHrmRole;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmRoleTransformer {
//       export type Payload = Prisma.erp_hrm_rolesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             is_builtin: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization: ErpHrmOrganizationAtSummaryTransformer.select(),
//             rolePermissions: ErpHrmRolePermissionTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_rolesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmRole> {
//         return {
//   createdAt: {string},
//   deletedAt: {null | string},
//   id: {string},
//   isBuiltin: {boolean},
//   name: {string},
//   organization: await ErpHrmOrganizationAtSummaryTransformer.transform(input.organization),
//   rolePermissions: await ArrayUtil.asyncMap(input.rolePermissions, ErpHrmRolePermissionTransformer.transform),
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
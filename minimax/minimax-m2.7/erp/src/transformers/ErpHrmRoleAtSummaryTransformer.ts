import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";

export namespace ErpHrmRoleAtSummaryTransformer {
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
        employees: {
          select: {
            id: true,
          },
        },
        rolePermissions: {
          select: {
            id: true,
          },
        },
        invitations: {
          select: {
            id: true,
          },
        },
      },
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmRole.ISummary> {
    return {
      id: input.id,
      name: input.name,
      isBuiltin: input.is_builtin,
      createdAt: toISOStringSafe(input.created_at),
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      permissionsCount: input.rolePermissions.length,
    } satisfies IErpHrmRole.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmRoleAtSummaryTransformer {
//       export type Payload = Prisma.erp_hrm_rolesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             isBuiltin: true,
//             createdAt: true,
//             permissionsCount: true,
//             ...
//           },
//         } satisfies Prisma.erp_hrm_rolesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmRole.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   isBuiltin: {boolean},
//   createdAt: {string},
//   organization: {IErpHrmOrganization.ISummary},
//   permissionsCount: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------
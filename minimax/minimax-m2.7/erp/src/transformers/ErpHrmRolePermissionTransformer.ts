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
import { ErpHrmRoleAtSummaryTransformer } from "./ErpHrmRoleAtSummaryTransformer";

export namespace ErpHrmRolePermissionTransformer {
  export type Payload = Prisma.erp_hrm_role_permissionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        permission: true,
        created_at: true,
        updated_at: true,
        role: ErpHrmRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_role_permissionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmRolePermission> {
    return {
      id: input.id,
      permission: input.permission,
      role: await ErpHrmRoleAtSummaryTransformer.transform(input.role),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
    } satisfies IErpHrmRolePermission;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmRolePermissionTransformer {
//       export type Payload = Prisma.erp_hrm_role_permissionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             permission: true,
//             created_at: true,
//             updated_at: true,
//             role: ErpHrmRoleAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_role_permissionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmRolePermission> {
//         return {
//   id: {string},
//   permission: {string},
//   role: await ErpHrmRoleAtSummaryTransformer.transform(input.role),
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
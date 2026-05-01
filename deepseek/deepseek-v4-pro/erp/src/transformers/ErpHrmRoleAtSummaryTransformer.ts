import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

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
        description: true,
        created_at: true,
        updated_at: true,
        rolePermissions: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_role_permissionsFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmRole.ISummary> {
    return {
      id: input.id,
      name: input.name,
      is_builtin: input.is_builtin,
      description: input.description,
      permissions_count: input.rolePermissions.length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
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
//             erp_hrm_organization_id: true,
//             name: true,
//             is_builtin: true,
//             description: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.erp_hrm_rolesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmRole.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   is_builtin: {boolean},
//   description: {string | null},
//   permissions_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformRolePermissionTransformer } from "./HrmPlatformRolePermissionTransformer";

export namespace HrmPlatformRoleTransformer {
  export type Payload = Prisma.hrm_platform_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        built_in: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        rolePermissions: HrmPlatformRolePermissionTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_rolesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmPlatformRole> {
    return {
      id: input.id,
      name: input.name,
      built_in: input.built_in,
      description: input.description ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      rolePermissions: await ArrayUtil.asyncMap(
        input.rolePermissions,
        HrmPlatformRolePermissionTransformer.transform,
      ),
    } satisfies IHrmPlatformRole;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformRoleTransformer {
//       export type Payload = Prisma.hrm_platform_rolesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             built_in: true,
//             description: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             hrm_platform_organization_id: true,
//             rolePermissions: HrmPlatformRolePermissionTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_rolesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformRole> {
//         return {
//   id: {string},
//   name: {string},
//   built_in: {boolean},
//   description: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   rolePermissions: await ArrayUtil.asyncMap(input.rolePermissions, HrmPlatformRolePermissionTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------
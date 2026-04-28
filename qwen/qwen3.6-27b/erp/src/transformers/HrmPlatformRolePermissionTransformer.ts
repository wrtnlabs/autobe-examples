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
import { HrmPlatformRoleAtSummaryTransformer } from "./HrmPlatformRoleAtSummaryTransformer";

export namespace HrmPlatformRolePermissionTransformer {
  export type Payload = Prisma.hrm_platform_role_permissionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        permission_key: true,
        created_at: true,
        updated_at: true,
        role: HrmPlatformRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_role_permissionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformRolePermission> {
    return {
      id: input.id,
      permission_key: input.permission_key,
      role: await HrmPlatformRoleAtSummaryTransformer.transform(input.role),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IHrmPlatformRolePermission;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformRolePermissionTransformer {
//       export type Payload = Prisma.hrm_platform_role_permissionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             permission_key: true,
//             created_at: true,
//             updated_at: true,
//             role: HrmPlatformRoleAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_role_permissionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformRolePermission> {
//         return {
//   id: {string},
//   permission_key: {string},
//   role: await HrmPlatformRoleAtSummaryTransformer.transform(input.role),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
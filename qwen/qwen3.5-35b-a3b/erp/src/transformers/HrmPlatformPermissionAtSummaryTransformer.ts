import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformPermissionAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_permissionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        role: true,
        organization: true,
      },
    } satisfies Prisma.hrm_platform_permissionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformPermission.ISummary> {
    return {
      id: input.id,
      code: input.code,
      description: input.description,
    } satisfies IHrmPlatformPermission.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformPermissionAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_permissionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             code: true,
//             description: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             role_id: true,
//             organization_id: true,
//           },
//         } satisfies Prisma.hrm_platform_permissionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformPermission.ISummary> {
//         return {
//   id: {string},
//   code: {string},
//   description: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
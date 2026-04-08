import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPermissionTransformer {
  export type Payload = Prisma.hrm_permissionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        permission_name: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.hrm_permissionsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmPermission> {
    return {
      id: input.id,
      permission_name: input.permission_name,
      description: input.description,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    } satisfies IHrmPermission;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPermissionTransformer {
//       export type Payload = Prisma.hrm_permissionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             permission_name: true,
//             description: true,
//             created_at: true,
//             updated_at: true,
//           },
//         } satisfies Prisma.hrm_permissionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPermission> {
//         return {
//   id: {string},
//   permission_name: {string},
//   description: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
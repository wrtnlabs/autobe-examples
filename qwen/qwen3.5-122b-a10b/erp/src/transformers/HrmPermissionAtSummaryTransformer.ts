import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPermissionAtSummaryTransformer {
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
  export async function transform(
    input: Payload,
  ): Promise<IHrmPermission.ISummary> {
    return {
      id: input.id,
      permission_name: input.permission_name,
      description: input.description,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IHrmPermission.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPermissionAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IHrmPermission.ISummary> {
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
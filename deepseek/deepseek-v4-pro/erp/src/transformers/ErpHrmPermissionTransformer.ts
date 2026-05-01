import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmPermissionTransformer {
  export type Payload = Prisma.erp_hrm_permissionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.erp_hrm_permissionsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmPermission> {
    return {
      id: input.id,
      key: input.key,
      description: input.description,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IErpHrmPermission;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmPermissionTransformer {
//       export type Payload = Prisma.erp_hrm_permissionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             key: true,
//             description: true,
//             created_at: true,
//             updated_at: true,
//           },
//         } satisfies Prisma.erp_hrm_permissionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmPermission> {
//         return {
//   id: {string},
//   key: {string},
//   description: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
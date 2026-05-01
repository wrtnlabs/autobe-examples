import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAdminTransformer {
  export type Payload = Prisma.shopping_mall_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        grade: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_adminsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallAdmin> {
    return {
      id: input.id,
      email: input.email,
      grade: input.grade,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IShoppingMallAdmin;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallAdminTransformer {
//       export type Payload = Prisma.shopping_mall_adminsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             grade: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.shopping_mall_adminsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallAdmin> {
//         return {
//   id: {string},
//   email: {string},
//   grade: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
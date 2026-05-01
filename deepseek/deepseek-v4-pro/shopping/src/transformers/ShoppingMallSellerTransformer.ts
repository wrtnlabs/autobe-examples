import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerProfileTransformer } from "./ShoppingMallSellerProfileTransformer";

export namespace ShoppingMallSellerTransformer {
  export type Payload = Prisma.shopping_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        approval_status: true,
        rejection_reason: true,
        suspended_at: true,
        banned_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: ShoppingMallSellerProfileTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSeller> {
    if (!input.profile)
      throw new HttpException("Seller profile not found", 404);
    return {
      id: input.id,
      email: input.email,
      approval_status: input.approval_status,
      rejection_reason: input.rejection_reason,
      suspended_at: input.suspended_at?.toISOString() ?? null,
      banned_at: input.banned_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      profile: await ShoppingMallSellerProfileTransformer.transform(
        input.profile,
      ),
    } satisfies IShoppingMallSeller;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallSellerTransformer {
//       export type Payload = Prisma.shopping_mall_sellersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             approval_status: true,
//             rejection_reason: true,
//             suspended_at: true,
//             banned_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.shopping_mall_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallSeller> {
//         return {
//   id: {string},
//   email: {string},
//   approval_status: {string},
//   rejection_reason: {string | null},
//   suspended_at: {string | null},
//   banned_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   profile: {IShoppingMallSellerProfile},
//         };
//       }
//     }
//--------------------------------------------------------------
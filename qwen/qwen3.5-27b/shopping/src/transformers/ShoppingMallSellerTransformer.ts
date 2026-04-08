import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

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
        approval_reason: true,
        rejection_reason: true,
        suspended: true,
        banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sellerProfile: {
          select: {
            shop_name: true,
            shop_description: true,
            logo_uri: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSeller> {
    if (!input.sellerProfile) {
      throw new HttpException("Seller profile not found", 404);
    }
    return {
      id: input.id,
      email: input.email,
      approval_status: input.approval_status,
      approval_reason: input.approval_reason ?? null,
      rejection_reason: input.rejection_reason ?? null,
      suspended: input.suspended,
      banned: input.banned,
      shop_name: input.sellerProfile.shop_name,
      shop_description: input.sellerProfile.shop_description,
      logo_uri: input.sellerProfile.logo_uri ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
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
//             approval_reason: true,
//             rejection_reason: true,
//             suspended: true,
//             banned: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.shopping_mall_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallSeller> {
//         return {
//   id: {string},
//   email: {string},
//   approval_status: {string},
//   approval_reason: {string | null},
//   rejection_reason: {string | null},
//   suspended: {boolean},
//   banned: {boolean},
//   shop_name: {string},
//   shop_description: {string},
//   logo_uri: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
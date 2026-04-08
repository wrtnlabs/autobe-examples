import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerProfileTransformer {
  export type Payload = Prisma.shopping_mall_seller_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        logo_uri: true,
        approval_status: true,
        rejection_reason: true,
        is_suspended: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_seller_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerProfile> {
    return {
      id: input.id,
      shop_name: input.shop_name,
      shop_description: input.shop_description,
      logo_uri: input.logo_uri,
      approval_status: input.approval_status,
      rejection_reason: input.rejection_reason,
      is_suspended: input.is_suspended,
      is_banned: input.is_banned,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IShoppingMallSellerProfile;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallSellerProfileTransformer {
//       export type Payload = Prisma.shopping_mall_seller_profilesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             shop_name: true,
//             shop_description: true,
//             logo_uri: true,
//             approval_status: true,
//             rejection_reason: true,
//             is_suspended: true,
//             is_banned: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             shopping_mall_seller_id: true,
//           },
//         } satisfies Prisma.shopping_mall_seller_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallSellerProfile> {
//         return {
//   id: {string},
//   shop_name: {string},
//   shop_description: {string},
//   logo_uri: {string | null},
//   approval_status: {string},
//   rejection_reason: {string | null},
//   is_suspended: {boolean},
//   is_banned: {boolean},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
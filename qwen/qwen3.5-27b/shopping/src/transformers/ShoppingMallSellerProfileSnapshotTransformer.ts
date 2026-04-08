import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerProfileSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_seller_profile_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sellerProfile: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_seller_profilesFindManyArgs,
        shop_name_before: true,
        shop_name_after: true,
        shop_description_before: true,
        shop_description_after: true,
        logo_image_before: true,
        logo_image_after: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_seller_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerProfileSnapshot> {
    return {
      id: input.id,
      shopping_mall_seller_profile_id: input.sellerProfile.id,
      shop_name_before: input.shop_name_before ?? null,
      shop_name_after: input.shop_name_after ?? null,
      shop_description_before: input.shop_description_before ?? null,
      shop_description_after: input.shop_description_after ?? null,
      logo_image_before: input.logo_image_before ?? null,
      logo_image_after: input.logo_image_after ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallSellerProfileSnapshotTransformer {
//       export type Payload = Prisma.shopping_mall_seller_profile_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             shop_name_before: true,
//             shop_name_after: true,
//             shop_description_before: true,
//             shop_description_after: true,
//             logo_image_before: true,
//             logo_image_after: true,
//             created_at: true,
//             shopping_mall_seller_profile_id: true,
//           },
//         } satisfies Prisma.shopping_mall_seller_profile_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallSellerProfileSnapshot> {
//         return {
//   id: {string},
//   shopping_mall_seller_profile_id: {string},
//   shop_name_before: {string | null},
//   shop_name_after: {string | null},
//   shop_description_before: {string | null},
//   shop_description_after: {string | null},
//   logo_image_before: {string | null},
//   logo_image_after: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
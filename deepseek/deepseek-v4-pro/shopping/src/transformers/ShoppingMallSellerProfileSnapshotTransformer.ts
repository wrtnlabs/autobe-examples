import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerProfileAtSummaryTransformer } from "./ShoppingMallSellerProfileAtSummaryTransformer";

export namespace ShoppingMallSellerProfileSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_seller_profile_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        logo_image: true,
        created_at: true,
        sellerProfile: ShoppingMallSellerProfileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_seller_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerProfileSnapshot> {
    return {
      id: input.id,
      sellerProfile:
        await ShoppingMallSellerProfileAtSummaryTransformer.transform(
          input.sellerProfile,
        ),
      shop_name: input.shop_name,
      shop_description: input.shop_description,
      logo_image: input.logo_image ?? null,
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallSellerProfileSnapshot;
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
//             shop_name: true,
//             shop_description: true,
//             logo_image: true,
//             created_at: true,
//             sellerProfile: ShoppingMallSellerProfileAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_seller_profile_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallSellerProfileSnapshot> {
//         return {
//   id: {string},
//   sellerProfile: await ShoppingMallSellerProfileAtSummaryTransformer.transform(input.sellerProfile),
//   shop_name: {string},
//   shop_description: {string},
//   logo_image: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
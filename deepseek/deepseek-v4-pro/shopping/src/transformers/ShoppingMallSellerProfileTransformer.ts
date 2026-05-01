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
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

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
        logo_image_uri: true,
        created_at: true,
        updated_at: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
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
      logo_image_uri: input.logo_image_uri,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
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
//             logo_image_uri: true,
//             created_at: true,
//             updated_at: true,
//             seller: ShoppingMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_seller_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallSellerProfile> {
//         return {
//   id: {string},
//   shop_name: {string | null},
//   shop_description: {string | null},
//   logo_image_uri: {string | null},
//   seller: await ShoppingMallSellerAtSummaryTransformer.transform(input.seller),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
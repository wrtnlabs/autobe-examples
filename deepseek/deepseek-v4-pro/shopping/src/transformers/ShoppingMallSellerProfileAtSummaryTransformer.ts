import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerProfileAtSummaryTransformer {
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
      },
    } satisfies Prisma.shopping_mall_seller_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerProfile.ISummary> {
    return {
      id: input.id,
      shop_name: input.shop_name,
      shop_description: input.shop_description,
      logo_image_uri: input.logo_image_uri,
    } satisfies IShoppingMallSellerProfile.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallSellerProfileAtSummaryTransformer {
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
//             shopping_mall_seller_id: true,
//           },
//         } satisfies Prisma.shopping_mall_seller_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallSellerProfile.ISummary> {
//         return {
//   id: {string},
//   shop_name: {string | null},
//   shop_description: {string | null},
//   logo_image_uri: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
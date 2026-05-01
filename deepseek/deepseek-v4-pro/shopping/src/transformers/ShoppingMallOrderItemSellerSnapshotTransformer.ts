import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderItemSellerSnapshotTransformer {
  export type Payload =
    Prisma.shopping_mall_order_item_seller_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        logo_image_url: true,
        created_at: true,
        orderItem: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_order_item_seller_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSellerSnapshot> {
    return {
      id: input.id,
      shop_name: input.shop_name,
      logo_image_url: input.logo_image_url ?? null,
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallOrderItemSellerSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallOrderItemSellerSnapshotTransformer {
//       export type Payload = Prisma.shopping_mall_order_item_seller_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             shop_name: true,
//             logo_image_url: true,
//             created_at: true,
//             shopping_mall_order_item_id: true,
//           },
//         } satisfies Prisma.shopping_mall_order_item_seller_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallOrderItemSellerSnapshot> {
//         return {
//   id: {string},
//   shop_name: {string},
//   logo_image_url: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderItemProductSnapshotImageTransformer } from "./ShoppingMallOrderItemProductSnapshotImageTransformer";

export namespace ShoppingMallOrderItemProductSnapshotTransformer {
  export type Payload =
    Prisma.shopping_mall_order_item_product_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        category_name: true,
        created_at: true,
        orderItem: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
        product: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_productsFindManyArgs,
        category: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
        productSnapshotImages:
          ShoppingMallOrderItemProductSnapshotImageTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_item_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemProductSnapshot> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      category_name: input.category_name,
      shopping_mall_product_id: input.product?.id ?? null,
      shopping_mall_category_id: input.category?.id ?? null,
      productSnapshotImages: await ArrayUtil.asyncMap(
        input.productSnapshotImages,
        ShoppingMallOrderItemProductSnapshotImageTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallOrderItemProductSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallOrderItemProductSnapshotTransformer {
//       export type Payload = Prisma.shopping_mall_order_item_product_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             base_price: true,
//             category_name: true,
//             created_at: true,
//             shopping_mall_order_item_id: true,
//             shopping_mall_product_id: true,
//             shopping_mall_category_id: true,
//             productSnapshotImages: ShoppingMallOrderItemProductSnapshotImageTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_order_item_product_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallOrderItemProductSnapshot> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   base_price: {number},
//   category_name: {string},
//   shopping_mall_product_id: {string | null},
//   shopping_mall_category_id: {string | null},
//   productSnapshotImages: await ArrayUtil.asyncMap(input.productSnapshotImages, ShoppingMallOrderItemProductSnapshotImageTransformer.transform),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
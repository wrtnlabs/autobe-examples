import { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ECommerceMallOrderItemSnapshotTransformer {
  export type Payload = Prisma.e_commerce_mall_order_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        product_name: true,
        product_description: true,
        product_base_price: true,
        variant_sku: true,
        variant_options: true,
        variant_price: true,
        created_at: true,
        orderItem: {
          select: { id: true },
        } satisfies Prisma.e_commerce_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.e_commerce_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallOrderItemSnapshot> {
    return {
      id: input.id,
      productName: input.product_name,
      productDescription: input.product_description,
      productBasePrice: input.product_base_price,
      variantSku: input.variant_sku,
      variantOptions: input.variant_options,
      variantPrice: input.variant_price ?? null,
      createdAt: input.created_at.toISOString(),
    } satisfies IECommerceMallOrderItemSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallOrderItemSnapshotTransformer {
//       export type Payload = Prisma.e_commerce_mall_order_item_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             product_name: true,
//             product_description: true,
//             product_base_price: true,
//             variant_sku: true,
//             variant_options: true,
//             variant_price: true,
//             created_at: true,
//             e_commerce_mall_order_item_id: true,
//           },
//         } satisfies Prisma.e_commerce_mall_order_item_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallOrderItemSnapshot> {
//         return {
//   id: {string},
//   productName: {string},
//   productDescription: {string},
//   productBasePrice: {number},
//   variantSku: {string},
//   variantOptions: {string},
//   variantPrice: {number | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
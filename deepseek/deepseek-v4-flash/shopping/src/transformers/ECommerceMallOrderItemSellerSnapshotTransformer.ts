import { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ECommerceMallOrderItemSellerSnapshotTransformer {
  export type Payload =
    Prisma.e_commerce_mall_order_item_seller_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        shop_logo: true,
        created_at: true,
        orderItem: {
          select: {
            id: true,
          },
        } satisfies Prisma.e_commerce_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.e_commerce_mall_order_item_seller_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallOrderItemSellerSnapshot> {
    return {
      id: input.id,
      shop_name: input.shop_name,
      shop_logo: input.shop_logo ?? null,
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallOrderItemSellerSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallOrderItemSellerSnapshotTransformer {
//       export type Payload = Prisma.e_commerce_mall_order_item_seller_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             shop_name: true,
//             shop_logo: true,
//             created_at: true,
//             e_commerce_mall_order_item_id: true,
//           },
//         } satisfies Prisma.e_commerce_mall_order_item_seller_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallOrderItemSellerSnapshot> {
//         return {
//   id: {string},
//   shop_name: {string},
//   shop_logo: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
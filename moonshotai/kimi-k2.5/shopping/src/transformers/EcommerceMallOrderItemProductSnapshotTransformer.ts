import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductSnapshotImageTransformer } from "./EcommerceMallProductSnapshotImageTransformer";

export namespace EcommerceMallOrderItemProductSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_order_item_product_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        category_name: true,
        base_price: true,
        created_at: true,
        orderItem: {
          select: {
            id: true,
          },
        },
        category: {
          select: {
            id: true,
          },
        },
        images: EcommerceMallProductSnapshotImageTransformer.select(),
        orderItemSnapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_order_item_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_order_item_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItemProductSnapshot> {
    return {
      id: input.id,
      orderItemId: input.orderItem.id,
      categoryId: input.category?.id ?? null,
      name: input.name,
      description: input.description,
      categoryName: input.category_name ?? null,
      basePrice: input.base_price,
      createdAt: input.created_at.toISOString(),
      images: await ArrayUtil.asyncMap(
        input.images,
        EcommerceMallProductSnapshotImageTransformer.transform,
      ),
    } satisfies IEcommerceMallOrderItemProductSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallOrderItemProductSnapshotTransformer {
//       export type Payload = Prisma.ecommerce_mall_order_item_product_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             category_name: true,
//             base_price: true,
//             created_at: true,
//             order_item_id: true,
//             category_id: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_order_item_product_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrderItemProductSnapshot> {
//         return {
//   id: {string},
//   orderItemId: {string},
//   categoryId: {string | null},
//   name: {string},
//   description: {string},
//   categoryName: {string | null},
//   basePrice: {number},
//   createdAt: {string},
//   images: {Array<IEcommerceMallProductSnapshotImage>},
//         };
//       }
//     }
//--------------------------------------------------------------
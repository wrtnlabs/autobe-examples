import { IEcommercePlatformSnapshotOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommercePlatformSnapshotOrderItemTransformer {
  export type Payload =
    Prisma.ecommerce_platform_snapshot_order_itemsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        quantity: true,
        unit_price: true,
        updated_at: true,
        snapshot: {
          select: {
            id: true,
            entity_type: true,
            created_at: true,
          },
        },
        orderItem: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_platform_snapshot_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformSnapshotOrderItem> {
    return {
      id: input.snapshot.id,
      entity_type: input.snapshot.entity_type,
      quantity: input.quantity,
      unit_price: input.unit_price,
      created_at: input.snapshot.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommercePlatformSnapshotOrderItem;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformSnapshotOrderItemTransformer {
//       export type Payload = Prisma.ecommerce_platform_snapshot_order_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             quantity: true,
//             unit_price: true,
//             updated_at: true,
//             ecommerce_platform_snapshots_id: true,
//             ecommerce_platform_order_items_id: true,
//           },
//         } satisfies Prisma.ecommerce_platform_snapshot_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformSnapshotOrderItem> {
//         return {
//   id: {string},
//   entity_type: {string},
//   quantity: {integer},
//   unit_price: {number},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
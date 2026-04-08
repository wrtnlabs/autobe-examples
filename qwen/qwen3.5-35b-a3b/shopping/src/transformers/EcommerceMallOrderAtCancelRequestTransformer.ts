import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallOrderAtCancelRequestTransformer {
  export type Payload = Prisma.ecommerce_mall_cancellation_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        item: true,
        order: {
          select: {
            items: {
              select: { id: true },
            },
          },
        },
        seller: true,
        ecommerceMallSnapshotss: true,
        ecommerceMallCancellationRequestSnapshotss: true,
      },
    } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrder.ICancelRequest> {
    const order = input.order as {
      items: {
        id: string;
      }[];
    };
    const itemIds = order.items.map((item) => item.id);
    return {
      reason: input.reason,
      itemIds: itemIds.length > 0 ? itemIds : undefined,
    } satisfies IEcommerceMallOrder.ICancelRequest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallOrderAtCancelRequestTransformer {
//       export type Payload = Prisma.ecommerce_mall_cancellation_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             reason: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrder.ICancelRequest> {
//         return {
//   reason: {string},
//   itemIds: {Array<string>},
//         };
//       }
//     }
//--------------------------------------------------------------
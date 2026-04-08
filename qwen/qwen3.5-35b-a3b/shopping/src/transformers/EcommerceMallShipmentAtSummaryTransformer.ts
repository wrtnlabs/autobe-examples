import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallShipmentAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_id: true,
        carrier: true,
        tracking_number: true,
        status: true,
        shipped_at: true,
        delivered_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        shipmentItems: true,
      },
    } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipment.ISummary> {
    return {
      id: input.id,
      status: typia.assert<"shipped" | "delivered">(input.status),
      carrier: input.carrier ?? undefined,
      tracking_number: input.tracking_number ?? undefined,
      shipped_at: input.shipped_at
        ? toISOStringSafe(input.shipped_at)
        : undefined,
      delivered_at: input.delivered_at
        ? toISOStringSafe(input.delivered_at)
        : undefined,
      created_at: toISOStringSafe(input.created_at),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    } satisfies IEcommerceMallShipment.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallShipmentAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_shipmentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             carrier: true,
//             tracking_number: true,
//             shipped_at: true,
//             delivered_at: true,
//             created_at: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShipment.ISummary> {
//         return {
//   id: {string},
//   status: {"shipped" | "delivered"},
//   carrier: {string},
//   tracking_number: {string},
//   shipped_at: {string},
//   delivered_at: {string},
//   created_at: {string},
//   seller: {IEcommerceMallSeller.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------
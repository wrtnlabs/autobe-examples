import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderItemAtSummaryTransformer } from "./EcommerceMallOrderItemAtSummaryTransformer";
import { EcommerceMallShipmentAtSummaryTransformer } from "./EcommerceMallShipmentAtSummaryTransformer";

export namespace EcommerceMallShipmentItemAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_shipment_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        quantity_shipped: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shipment: EcommerceMallShipmentAtSummaryTransformer.select(),
        orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_shipment_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipmentItem.ISummary> {
    return {
      id: input.id,
      status: input.status,
      quantity_shipped: input.quantity_shipped,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      shipment: await EcommerceMallShipmentAtSummaryTransformer.transform(
        input.shipment,
      ),
      orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
    } satisfies IEcommerceMallShipmentItem.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallShipmentItemAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_shipment_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             quantity_shipped: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             shipment: EcommerceMallShipmentAtSummaryTransformer.select(),
//             orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_shipment_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShipmentItem.ISummary> {
//         return {
//   id: {string},
//   status: {string},
//   quantity_shipped: {integer},
//   created_at: {string},
//   updated_at: {string},
//   shipment: await EcommerceMallShipmentAtSummaryTransformer.transform(input.shipment),
//   orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//         };
//       }
//     }
//--------------------------------------------------------------
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallShipmentAtSummaryTransformer } from "./EcommerceMallShipmentAtSummaryTransformer";

export namespace EcommerceMallShipmentDeliveryTransformer {
  export type Payload = Prisma.ecommerce_mall_shipment_deliveriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        delivered_at: true,
        is_auto_delivered: true,
        shipment: EcommerceMallShipmentAtSummaryTransformer.select(),
        customer: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.ecommerce_mall_shipment_deliveriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipmentDelivery> {
    return {
      id: input.id,
      deliveredAt: input.delivered_at.toISOString(),
      isAutoDelivered: input.is_auto_delivered,
      shipment: await EcommerceMallShipmentAtSummaryTransformer.transform(
        input.shipment,
      ),
      customer: input.customer ? {} : null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallShipmentDelivery;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallShipmentDeliveryTransformer {
//       export type Payload = Prisma.ecommerce_mall_shipment_deliveriesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             delivered_at: true,
//             is_auto_delivered: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             shipment: EcommerceMallShipmentAtSummaryTransformer.select(),
//             customer_id: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_shipment_deliveriesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallShipmentDelivery> {
//         return {
//   id: {string},
//   deliveredAt: {string},
//   isAutoDelivered: {boolean},
//   shipment: await EcommerceMallShipmentAtSummaryTransformer.transform(input.shipment),
//   customer: {IEcommerceMallCustomer.ISummary | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
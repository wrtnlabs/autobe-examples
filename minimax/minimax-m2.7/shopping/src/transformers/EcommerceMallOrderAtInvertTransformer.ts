import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallOrderItemAtInvertTransformer } from "./EcommerceMallOrderItemAtInvertTransformer";
import { EcommerceMallShipmentAtSummaryTransformer } from "./EcommerceMallShipmentAtSummaryTransformer";
import { EcommerceMallShippingAddressAtSummaryTransformer } from "./EcommerceMallShippingAddressAtSummaryTransformer";

export namespace EcommerceMallOrderAtInvertTransformer {
  export type Payload = Prisma.ecommerce_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        subtotal: true,
        shipping_cost: true,
        total_amount: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        shippingAddress:
          EcommerceMallShippingAddressAtSummaryTransformer.select(),
        orderItems: EcommerceMallOrderItemAtInvertTransformer.select(),
        shipments: EcommerceMallShipmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrder.IInvert> {
    return {
      id: input.id,
      orderNumber: input.order_number,
      subtotal: input.subtotal,
      shippingCost: input.shipping_cost,
      totalAmount: input.total_amount,
      status: input.status,
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      shippingAddress:
        await EcommerceMallShippingAddressAtSummaryTransformer.transform(
          input.shippingAddress,
        ),
      orderItems: await ArrayUtil.asyncMap(
        input.orderItems,
        EcommerceMallOrderItemAtInvertTransformer.transform,
      ),
      shipments: await ArrayUtil.asyncMap(
        input.shipments,
        EcommerceMallShipmentAtSummaryTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallOrder.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallOrderAtInvertTransformer {
//       export type Payload = Prisma.ecommerce_mall_ordersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             order_number: true,
//             subtotal: true,
//             shipping_cost: true,
//             total_amount: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer: EcommerceMallCustomerAtSummaryTransformer.select(),
//             shippingAddress: EcommerceMallShippingAddressAtSummaryTransformer.select(),
//             shipments: EcommerceMallShipmentAtSummaryTransformer.select(),
//             orderItems: EcommerceMallOrderItemAtInvertTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrder.IInvert> {
//         return {
//   id: {string},
//   orderNumber: {string},
//   subtotal: {number},
//   shippingCost: {number},
//   totalAmount: {number},
//   status: {string},
//   customer: await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   shippingAddress: await EcommerceMallShippingAddressAtSummaryTransformer.transform(input.shippingAddress),
//   orderItems: await ArrayUtil.asyncMap(input.orderItems, EcommerceMallOrderItemAtInvertTransformer.transform),
//   shipments: await ArrayUtil.asyncMap(input.shipments, EcommerceMallShipmentAtSummaryTransformer.transform),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
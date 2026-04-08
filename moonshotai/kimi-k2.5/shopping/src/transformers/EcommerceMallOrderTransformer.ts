import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderItemTransformer } from "./EcommerceMallOrderItemTransformer";
import { EcommerceMallShipmentTransformer } from "./EcommerceMallShipmentTransformer";

export namespace EcommerceMallOrderTransformer {
  export type Payload = Prisma.ecommerce_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        total_price: true,
        status: true,
        recipient_name: true,
        recipient_phone: true,
        street_address: true,
        city: true,
        state: true,
        postal_code: true,
        country: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
            email: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
        orderItems: EcommerceMallOrderItemTransformer.select(),
        shipments: EcommerceMallShipmentTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrder> {
    return {
      id: input.id,
      orderNumber: input.order_number,
      totalPrice: input.total_price,
      status: input.status as IEcommerceMallOrder["status"],
      recipientName: input.recipient_name,
      recipientPhone: input.recipient_phone,
      streetAddress: input.street_address,
      city: input.city,
      state: input.state,
      postalCode: input.postal_code,
      country: input.country,
      customer: {
        id: input.customer.id,
        email: input.customer.email,
      } satisfies IEcommerceMallCustomer.ISummary,
      orderItems: await ArrayUtil.asyncMap(
        input.orderItems,
        EcommerceMallOrderItemTransformer.transform,
      ),
      shipments: await ArrayUtil.asyncMap(
        input.shipments,
        EcommerceMallShipmentTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallOrder;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallOrderTransformer {
//       export type Payload = Prisma.ecommerce_mall_ordersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             order_number: true,
//             total_price: true,
//             status: true,
//             recipient_name: true,
//             recipient_phone: true,
//             street_address: true,
//             city: true,
//             state: true,
//             postal_code: true,
//             country: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer_id: true,
//             shipments: EcommerceMallShipmentTransformer.select(),
//             orderItems: EcommerceMallOrderItemTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrder> {
//         return {
//   id: {string},
//   orderNumber: {string},
//   totalPrice: {number},
//   status: {"paid" | "shipped" | "delivered" | "cancelled" | "refunded" | "partially_completed"},
//   recipientName: {string},
//   recipientPhone: {string},
//   streetAddress: {string},
//   city: {string},
//   state: {string | null},
//   postalCode: {string},
//   country: {string},
//   customer: {IEcommerceMallCustomer.ISummary},
//   orderItems: await ArrayUtil.asyncMap(input.orderItems, EcommerceMallOrderItemTransformer.transform),
//   shipments: await ArrayUtil.asyncMap(input.shipments, EcommerceMallShipmentTransformer.transform),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
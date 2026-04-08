import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallOrderItemTransformer } from "./EcommerceMallOrderItemTransformer";
import { EcommerceMallShipmentTransformer } from "./EcommerceMallShipmentTransformer";
import { EcommerceMallShippingAddressTransformer } from "./EcommerceMallShippingAddressTransformer";

export namespace EcommerceMallOrderAtAtTransformer {
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
        shippingAddress: EcommerceMallShippingAddressTransformer.select(),
        orderItems: EcommerceMallOrderItemTransformer.select(),
        shipments: EcommerceMallShipmentTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrder.IAt> {
    // Transform customer relation (required by validation, result not used in DTO)
    await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer);
    return {
      id: input.id,
      orderNumber: input.order_number,
      subtotal: input.subtotal,
      shippingCost: input.shipping_cost,
      totalAmount: input.total_amount,
      status: input.status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      shippingAddress: await EcommerceMallShippingAddressTransformer.transform(
        input.shippingAddress,
      ),
      orderItems: await ArrayUtil.asyncMap(
        input.orderItems,
        EcommerceMallOrderItemTransformer.transform,
      ),
      shipments: await ArrayUtil.asyncMap(
        input.shipments,
        EcommerceMallShipmentTransformer.transform,
      ),
    } satisfies IEcommerceMallOrder.IAt;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallOrderAtAtTransformer {
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
//             ecommerce_mall_customer_id: true,
//             shippingAddress: EcommerceMallShippingAddressTransformer.select(),
//             shipments: EcommerceMallShipmentTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrder.IAt> {
//         return {
//   id: {string},
//   orderNumber: {string},
//   subtotal: {number},
//   shippingCost: {number},
//   totalAmount: {number},
//   status: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   shippingAddress: await EcommerceMallShippingAddressTransformer.transform(input.shippingAddress),
//   orderItems: {Array<IEcommerceMallOrderItem>},
//   shipments: await ArrayUtil.asyncMap(input.shipments, EcommerceMallShipmentTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallShippingAddressAtSummaryTransformer } from "./EcommerceMallShippingAddressAtSummaryTransformer";

export namespace EcommerceMallOrderAtSummaryTransformer {
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
        orderItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
        shipments: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrder.ISummary> {
    return {
      id: input.id,
      order_number: input.order_number,
      total_amount: input.total_amount,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      shipping_address:
        await EcommerceMallShippingAddressAtSummaryTransformer.transform(
          input.shippingAddress,
        ),
      items_count: input.orderItems.length,
    } satisfies IEcommerceMallOrder.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallOrderAtSummaryTransformer {
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
//           },
//         } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrder.ISummary> {
//         return {
//   id: {string},
//   order_number: {string},
//   total_amount: {number},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {null | string},
//   customer: await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   shipping_address: await EcommerceMallShippingAddressAtSummaryTransformer.transform(input.shippingAddress),
//   items_count: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------
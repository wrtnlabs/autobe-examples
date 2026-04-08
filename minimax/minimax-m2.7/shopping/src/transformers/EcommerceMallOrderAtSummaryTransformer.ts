import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";

export namespace EcommerceMallOrderAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        status: true,
        subtotal: true,
        shipping_cost: true,
        total_amount: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        shippingAddress: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            orderItems: true,
            shipments: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrder.ISummary> {
    return {
      id: input.id,
      order_number: input.order_number,
      status: input.status,
      subtotal: input.subtotal,
      shipping_cost: input.shipping_cost,
      total_amount: input.total_amount,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      items_count: input._count.orderItems,
      shipments_count: input._count.shipments,
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
//             ecommerce_mall_shipping_address_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrder.ISummary> {
//         return {
//   id: {string},
//   order_number: {string},
//   status: {string},
//   subtotal: {number},
//   shipping_cost: {number},
//   total_amount: {number},
//   created_at: {string},
//   deleted_at: {null | string},
//   customer: await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   items_count: {integer},
//   shipments_count: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------
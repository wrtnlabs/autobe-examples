import { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallOrderSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_order_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        order_date: true,
        customer_name: true,
        customer_phone: true,
        shipping_recipient_name: true,
        shipping_phone: true,
        shipping_street: true,
        shipping_city: true,
        shipping_state: true,
        shipping_postal_code: true,
        shipping_country: true,
        item_count: true,
        subtotal: true,
        shipping_fee: true,
        total_amount: true,
        order_status: true,
        order: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_order_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderSnapshot.ISummary> {
    return {
      id: input.id,
      order_number: input.order_number,
      order_date: input.order_date.toISOString(),
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      shipping_recipient_name: input.shipping_recipient_name,
      shipping_phone: input.shipping_phone,
      shipping_street: input.shipping_street,
      shipping_city: input.shipping_city,
      shipping_state: input.shipping_state,
      shipping_postal_code: input.shipping_postal_code,
      shipping_country: input.shipping_country,
      item_count: input.item_count,
      subtotal: input.subtotal,
      shipping_fee: input.shipping_fee,
      total_amount: input.total_amount,
      order_status: input.order_status,
    } satisfies IEcommerceMallOrderSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallOrderSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_order_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             order_number: true,
//             order_date: true,
//             customer_name: true,
//             customer_phone: true,
//             shipping_recipient_name: true,
//             shipping_phone: true,
//             shipping_street: true,
//             shipping_city: true,
//             shipping_state: true,
//             shipping_postal_code: true,
//             shipping_country: true,
//             item_count: true,
//             subtotal: true,
//             shipping_fee: true,
//             total_amount: true,
//             order_status: true,
//             ecommerce_mall_order_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_order_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrderSnapshot.ISummary> {
//         return {
//   id: {string},
//   order_number: {string},
//   order_date: {string},
//   customer_name: {string},
//   customer_phone: {string},
//   shipping_recipient_name: {string},
//   shipping_phone: {string},
//   shipping_street: {string},
//   shipping_city: {string},
//   shipping_state: {string},
//   shipping_postal_code: {string},
//   shipping_country: {string},
//   item_count: {integer},
//   subtotal: {number},
//   shipping_fee: {number},
//   total_amount: {number},
//   order_status: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
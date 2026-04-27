import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallCustomerAtSummaryTransformer } from "./ECommerceMallCustomerAtSummaryTransformer";

export namespace ECommerceMallOrderAtSummaryTransformer {
  export type Payload = Prisma.e_commerce_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        total_price: true,
        created_at: true,
        customer: ECommerceMallCustomerAtSummaryTransformer.select(),
        orderItems: {
          select: {
            status: true,
          },
        } satisfies Prisma.e_commerce_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.e_commerce_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallOrder.ISummary> {
    const status = computeOrderStatus(
      input.orderItems.map((item) => item.status),
    );
    return {
      id: input.id,
      code: input.code,
      total_price: input.total_price,
      status,
      customer: await ECommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallOrder.ISummary;
  }
}
function computeOrderStatus(statuses: string[]): string {
  if (statuses.length === 0) {
    return "paid";
  }
  const uniqueStatuses = new Set(statuses);
  if (uniqueStatuses.size === 1) {
    return statuses[0];
  }
  const terminalStates = ["delivered", "cancelled", "refunded"];
  const allTerminal = statuses.every((s) => terminalStates.includes(s));
  if (allTerminal) {
    return "partially_completed";
  }
  const hasShipped = statuses.some((s) => s === "shipped");
  const hasDelivered = statuses.some((s) => s === "delivered");
  if (hasShipped && !hasDelivered) {
    return "shipped";
  }
  return "partially_completed";
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallOrderAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_ordersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             code: true,
//             total_price: true,
//             shipping_recipient_name: true,
//             shipping_phone: true,
//             shipping_street_address: true,
//             shipping_city: true,
//             shipping_state_province: true,
//             shipping_postal_code: true,
//             shipping_country: true,
//             created_at: true,
//             updated_at: true,
//             customer: ECommerceMallCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallOrder.ISummary> {
//         return {
//   id: {string},
//   code: {string},
//   total_price: {number},
//   status: {string},
//   customer: await ECommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
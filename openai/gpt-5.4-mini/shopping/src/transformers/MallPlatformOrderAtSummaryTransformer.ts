import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformCustomerAtSummaryTransformer } from "./MallPlatformCustomerAtSummaryTransformer";

export namespace MallPlatformOrderAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformOrder.ISummary> {
    return {
      id: input.id,
      customer: await MallPlatformCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      orderNumber: input.order_number,
      status: input.status,
      totalAmount: Number(input.total_amount),
      recipientName: input.recipient_name,
      recipientPhone: input.recipient_phone,
      streetAddress: input.street_address,
      city: input.city,
      stateProvince: input.state_province,
      postalCode: input.postal_code,
      country: input.country,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformOrder.ISummary;
  }
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        status: true,
        total_amount: true,
        recipient_name: true,
        recipient_phone: true,
        street_address: true,
        city: true,
        state_province: true,
        postal_code: true,
        country: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: MallPlatformCustomerAtSummaryTransformer.select(),
        orderItems: { select: {} },
        shipments: { select: {} },
      },
    } satisfies Prisma.mall_platform_ordersFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformOrderAtSummaryTransformer {
//       export type Payload = Prisma.mall_platform_ordersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             order_number: true,
//             status: true,
//             total_amount: true,
//             recipient_name: true,
//             recipient_phone: true,
//             street_address: true,
//             city: true,
//             state_province: true,
//             postal_code: true,
//             country: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer: MallPlatformCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformOrder.ISummary> {
//         return {
//   id: {string},
//   customer: await MallPlatformCustomerAtSummaryTransformer.transform(input.customer),
//   orderNumber: {string},
//   status: {string},
//   totalAmount: {number},
//   recipientName: {string},
//   recipientPhone: {string},
//   streetAddress: {string},
//   city: {string},
//   stateProvince: {string},
//   postalCode: {string},
//   country: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
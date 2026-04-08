import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformCustomerAtSummaryTransformer } from "./MallPlatformCustomerAtSummaryTransformer";
import { MallPlatformOrderItemTransformer } from "./MallPlatformOrderItemTransformer";
import { MallPlatformShipmentTransformer } from "./MallPlatformShipmentTransformer";

export namespace MallPlatformOrderTransformer {
  export type Payload = Prisma.mall_platform_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(input: Payload): Promise<IMallPlatformOrder> {
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
      orderItems: await ArrayUtil.asyncMap(
        input.orderItems,
        MallPlatformOrderItemTransformer.transform,
      ),
      shipments: await ArrayUtil.asyncMap(
        input.shipments,
        MallPlatformShipmentTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformOrder;
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
        orderItems: MallPlatformOrderItemTransformer.select(),
        shipments: MallPlatformShipmentTransformer.select(),
      },
    } satisfies Prisma.mall_platform_ordersFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformOrderTransformer {
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
//             orderItems: MallPlatformOrderItemTransformer.select(),
//             shipments: MallPlatformShipmentTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformOrder> {
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
//   orderItems: await ArrayUtil.asyncMap(input.orderItems, MallPlatformOrderItemTransformer.transform),
//   shipments: await ArrayUtil.asyncMap(input.shipments, MallPlatformShipmentTransformer.transform),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformShippingAddressAtSummaryTransformer } from "./EcommercePlatformShippingAddressAtSummaryTransformer";

export namespace EcommercePlatformOrderAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_platform_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        status: true,
        created_at: true,
        shippingAddress:
          EcommercePlatformShippingAddressAtSummaryTransformer.select(),
        items: {
          select: {
            quantity: true,
            price: true,
          },
        } satisfies Prisma.ecommerce_platform_order_itemsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_platform_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformOrder.ISummary> {
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      orderNumber: input.order_number,
      shippingAddress:
        await EcommercePlatformShippingAddressAtSummaryTransformer.transform(
          input.shippingAddress,
        ),
      status: input.status,
      totalPrice: input.items.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformOrderAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_ordersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             order_number: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             ecommerce_platform_customer_profile_id: true,
//             shippingAddress: EcommercePlatformShippingAddressAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformOrder.ISummary> {
//         return {
//   id: {string},
//   createdAt: {string},
//   orderNumber: {string},
//   shippingAddress: await EcommercePlatformShippingAddressAtSummaryTransformer.transform(input.shippingAddress),
//   status: {string},
//   totalPrice: {number},
//         };
//       }
//     }
//--------------------------------------------------------------
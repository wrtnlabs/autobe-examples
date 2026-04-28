import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformCustomerProfileAtSummaryTransformer } from "./EcommercePlatformCustomerProfileAtSummaryTransformer";
import { EcommercePlatformOrderItemTransformer } from "./EcommercePlatformOrderItemTransformer";
import { EcommercePlatformShippingAddressAtSummaryTransformer } from "./EcommercePlatformShippingAddressAtSummaryTransformer";

export namespace EcommercePlatformOrderTransformer {
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
        updated_at: true,
        customerProfile:
          EcommercePlatformCustomerProfileAtSummaryTransformer.select(),
        shippingAddress:
          EcommercePlatformShippingAddressAtSummaryTransformer.select(),
        items: EcommercePlatformOrderItemTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformOrder> {
    return {
      id: input.id,
      order_number: input.order_number,
      status: input.status,
      customerProfile:
        await EcommercePlatformCustomerProfileAtSummaryTransformer.transform(
          input.customerProfile,
        ),
      shippingAddress:
        await EcommercePlatformShippingAddressAtSummaryTransformer.transform(
          input.shippingAddress,
        ),
      items: await ArrayUtil.asyncMap(
        input.items,
        EcommercePlatformOrderItemTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommercePlatformOrder;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformOrderTransformer {
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
//             customerProfile: EcommercePlatformCustomerProfileAtSummaryTransformer.select(),
//             shippingAddress: EcommercePlatformShippingAddressAtSummaryTransformer.select(),
//             items: EcommercePlatformOrderItemTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformOrder> {
//         return {
//   id: {string},
//   order_number: {string},
//   status: {string},
//   customerProfile: await EcommercePlatformCustomerProfileAtSummaryTransformer.transform(input.customerProfile),
//   shippingAddress: await EcommercePlatformShippingAddressAtSummaryTransformer.transform(input.shippingAddress),
//   items: await ArrayUtil.asyncMap(input.items, EcommercePlatformOrderItemTransformer.transform),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
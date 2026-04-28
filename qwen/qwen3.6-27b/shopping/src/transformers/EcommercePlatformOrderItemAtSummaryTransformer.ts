import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
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
import { EcommercePlatformOrderAtSummaryTransformer } from "./EcommercePlatformOrderAtSummaryTransformer";
import { EcommercePlatformProductVariantAtSummaryTransformer } from "./EcommercePlatformProductVariantAtSummaryTransformer";

export namespace EcommercePlatformOrderItemAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_platform_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        price: true,
        status: true,
        created_at: true,
        updated_at: true,
        order: EcommercePlatformOrderAtSummaryTransformer.select(),
        productVariant:
          EcommercePlatformProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformOrderItem.ISummary> {
    return {
      id: input.id,
      quantity: input.quantity,
      price: input.price,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      order: await EcommercePlatformOrderAtSummaryTransformer.transform(
        input.order,
      ),
      productVariant:
        await EcommercePlatformProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformOrderItemAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_order_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             price: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             order: EcommercePlatformOrderAtSummaryTransformer.select(),
//             productVariant: EcommercePlatformProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformOrderItem.ISummary> {
//         return {
//   id: {string},
//   quantity: {integer},
//   price: {number},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//   order: await EcommercePlatformOrderAtSummaryTransformer.transform(input.order),
//   productVariant: await EcommercePlatformProductVariantAtSummaryTransformer.transform(input.productVariant),
//         };
//       }
//     }
//--------------------------------------------------------------
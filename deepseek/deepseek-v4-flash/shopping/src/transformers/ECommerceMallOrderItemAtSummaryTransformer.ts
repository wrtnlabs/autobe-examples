import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallOrderAtSummaryTransformer } from "./ECommerceMallOrderAtSummaryTransformer";
import { ECommerceMallProductVariantAtSummaryTransformer } from "./ECommerceMallProductVariantAtSummaryTransformer";

export namespace ECommerceMallOrderItemAtSummaryTransformer {
  export type Payload = Prisma.e_commerce_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        unit_price: true,
        status: true,
        created_at: true,
        order: ECommerceMallOrderAtSummaryTransformer.select(),
        productVariant:
          ECommerceMallProductVariantAtSummaryTransformer.select(),
        productVariantSnapshot: {
          select: {
            product_name: true,
            variant_sku: true,
            variant_options: true,
          },
        } satisfies Prisma.e_commerce_mall_order_item_snapshotsFindManyArgs,
        sellerSnapshot: {
          select: {
            shop_name: true,
          },
        } satisfies Prisma.e_commerce_mall_order_item_seller_snapshotsFindManyArgs,
      },
    } satisfies Prisma.e_commerce_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallOrderItem.ISummary> {
    return {
      id: input.id,
      product_name: input.productVariantSnapshot?.product_name ?? "",
      variant_sku: input.productVariantSnapshot?.variant_sku ?? "",
      variant_options: input.productVariantSnapshot?.variant_options ?? "",
      shop_name: input.sellerSnapshot?.shop_name ?? "",
      quantity: input.quantity,
      unit_price: input.unit_price,
      subtotal: input.quantity * input.unit_price,
      status: input.status,
      order: await ECommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      productVariant:
        await ECommerceMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallOrderItem.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallOrderItemAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_order_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             unit_price: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             order: ECommerceMallOrderAtSummaryTransformer.select(),
//             productVariant: ECommerceMallProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallOrderItem.ISummary> {
//         return {
//   id: {string},
//   product_name: {string},
//   variant_sku: {string},
//   variant_options: {string},
//   shop_name: {string},
//   quantity: {integer},
//   unit_price: {number},
//   subtotal: {number},
//   status: {string},
//   order: await ECommerceMallOrderAtSummaryTransformer.transform(input.order),
//   productVariant: await ECommerceMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
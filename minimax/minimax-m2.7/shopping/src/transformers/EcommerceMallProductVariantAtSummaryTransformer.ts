import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallProductVariantOptionValueAtSummaryTransformer } from "./EcommerceMallProductVariantOptionValueAtSummaryTransformer";

export namespace EcommerceMallProductVariantAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price: true,
        quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: EcommerceMallProductAtSummaryTransformer.select(),
        optionValues:
          EcommerceMallProductVariantOptionValueAtSummaryTransformer.select(),
        inventoryRecords: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs,
        cartItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs,
        orderItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariant.ISummary> {
    return {
      created_at: input.created_at.toISOString(),
      id: input.id,
      in_stock: input.quantity > 0,
      optionValues: await ArrayUtil.asyncMap(
        input.optionValues,
        EcommerceMallProductVariantOptionValueAtSummaryTransformer.transform,
      ),
      price: input.price,
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      quantity: input.quantity,
      sku_code: input.sku_code,
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommerceMallProductVariant.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductVariantAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_product_variantsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             sku_code: true,
//             price: true,
//             quantity: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             product: EcommerceMallProductAtSummaryTransformer.select(),
//             optionValues: EcommerceMallProductVariantOptionValueAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductVariant.ISummary> {
//         return {
//   created_at: {string},
//   id: {string},
//   in_stock: {boolean},
//   optionValues: await ArrayUtil.asyncMap(input.optionValues, EcommerceMallProductVariantOptionValueAtSummaryTransformer.transform),
//   price: {number | null},
//   product: await EcommerceMallProductAtSummaryTransformer.transform(input.product),
//   quantity: {integer},
//   sku_code: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
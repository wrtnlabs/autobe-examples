import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

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
        product: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_productsFindFirstArgs,
        optionValues: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_product_variant_option_valuesFindManyArgs,
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
      id: input.id,
      skuCode: input.sku_code,
      price: input.price,
      quantity: input.quantity,
      productId: input.product.id,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
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
//             ecommerce_mall_product_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductVariant.ISummary> {
//         return {
//   id: {string},
//   skuCode: {string},
//   price: {number | null},
//   quantity: {integer},
//   productId: {string},
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
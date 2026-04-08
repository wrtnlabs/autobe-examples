import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductVariantOptionValueTransformer } from "./EcommerceMallProductVariantOptionValueTransformer";

export namespace EcommerceMallProductVariantAtBulkTransformer {
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
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
        optionValues:
          EcommerceMallProductVariantOptionValueTransformer.select(),
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
  ): Promise<IEcommerceMallProductVariant.IBulk> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      price: input.price ?? null,
      quantity: input.quantity,
      option_values: await ArrayUtil.asyncMap(
        input.optionValues,
        EcommerceMallProductVariantOptionValueTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommerceMallProductVariant.IBulk;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductVariantAtBulkTransformer {
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
//             optionValues: EcommerceMallProductVariantOptionValueTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductVariant.IBulk> {
//         return {
//   id: {string},
//   sku_code: {string},
//   price: {null | number},
//   quantity: {integer},
//   option_values: await ArrayUtil.asyncMap(input.optionValues, EcommerceMallProductVariantOptionValueTransformer.transform),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
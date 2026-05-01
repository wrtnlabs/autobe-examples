import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductVariantOptionValueTransformer } from "./ShoppingMallProductVariantOptionValueTransformer";

export namespace ShoppingMallProductVariantTransformer {
  export type Payload = Prisma.shopping_mall_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: {
          select: {
            base_price: true,
          },
        } satisfies Prisma.shopping_mall_productsFindManyArgs,
        inventoryRecords: {
          select: {
            quantity_change: true,
          },
        } satisfies Prisma.shopping_mall_inventory_recordsFindManyArgs,
        optionValues: ShoppingMallProductVariantOptionValueTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariant> {
    return {
      id: input.id,
      code: input.code,
      optionValues: await ArrayUtil.asyncMap(
        input.optionValues,
        ShoppingMallProductVariantOptionValueTransformer.transform,
      ),
      price: input.price,
      base_price: input.product.base_price,
      stock_quantity: input.inventoryRecords.reduce(
        (sum, record) => sum + record.quantity_change,
        0,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IShoppingMallProductVariant;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallProductVariantTransformer {
//       export type Payload = Prisma.shopping_mall_product_variantsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             code: true,
//             price: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             shopping_mall_product_id: true,
//             optionValues: ShoppingMallProductVariantOptionValueTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_product_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProductVariant> {
//         return {
//   id: {string},
//   code: {string},
//   optionValues: await ArrayUtil.asyncMap(input.optionValues, ShoppingMallProductVariantOptionValueTransformer.transform),
//   price: {number | null},
//   base_price: {number},
//   stock_quantity: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
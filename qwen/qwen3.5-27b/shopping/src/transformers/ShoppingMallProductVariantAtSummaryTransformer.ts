import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";
import { ShoppingMallProductVariantOptionTransformer } from "./ShoppingMallProductVariantOptionTransformer";

export namespace ShoppingMallProductVariantAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: ShoppingMallProductAtSummaryTransformer.select(),
        variantOptions: ShoppingMallProductVariantOptionTransformer.select(),
        inventoryRecords: {
          select: {
            quantity_change: true,
          },
        } satisfies Prisma.shopping_mall_inventory_recordsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariant.ISummary> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      price: input.price,
      options: await ArrayUtil.asyncMap(
        input.variantOptions,
        ShoppingMallProductVariantOptionTransformer.transform,
      ),
      stock_quantity: input.inventoryRecords.reduce(
        (sum, record) => sum + record.quantity_change,
        0,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      product: await ShoppingMallProductAtSummaryTransformer.transform(
        input.product,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallProductVariantAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_product_variantsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             sku_code: true,
//             price: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             product: ShoppingMallProductAtSummaryTransformer.select(),
//             variantOptions: ShoppingMallProductVariantOptionTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_product_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProductVariant.ISummary> {
//         return {
//   id: {string},
//   sku_code: {string},
//   price: {number | null},
//   options: await ArrayUtil.asyncMap(input.variantOptions, ShoppingMallProductVariantOptionTransformer.transform),
//   stock_quantity: {integer},
//   created_at: {string},
//   updated_at: {string},
//   product: await ShoppingMallProductAtSummaryTransformer.transform(input.product),
//         };
//       }
//     }
//--------------------------------------------------------------
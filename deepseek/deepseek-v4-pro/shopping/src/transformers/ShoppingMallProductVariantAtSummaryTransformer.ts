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
import { ShoppingMallProductVariantOptionValueAtSummaryTransformer } from "./ShoppingMallProductVariantOptionValueAtSummaryTransformer";

export namespace ShoppingMallProductVariantAtSummaryTransformer {
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
        optionValues:
          ShoppingMallProductVariantOptionValueAtSummaryTransformer.select(),
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
      code: input.code,
      optionValues: await ArrayUtil.asyncMap(
        input.optionValues,
        ShoppingMallProductVariantOptionValueAtSummaryTransformer.transform,
      ),
      price: input.price ?? null,
      stock_quantity: input.inventoryRecords.reduce(
        (sum, r) => sum + r.quantity_change,
        0,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IShoppingMallProductVariant.ISummary;
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
//             code: true,
//             price: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             shopping_mall_product_id: true,
//             optionValues: ShoppingMallProductVariantOptionValueAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_product_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProductVariant.ISummary> {
//         return {
//   id: {string},
//   code: {string},
//   optionValues: await ArrayUtil.asyncMap(input.optionValues, ShoppingMallProductVariantOptionValueAtSummaryTransformer.transform),
//   price: {number | null},
//   stock_quantity: {integer},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
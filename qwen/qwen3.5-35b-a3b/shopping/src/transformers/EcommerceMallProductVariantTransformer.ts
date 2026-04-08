import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";

export namespace EcommerceMallProductVariantTransformer {
  export type Payload = Prisma.ecommerce_mall_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        price: true,
        stock_quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: EcommerceMallProductAtSummaryTransformer.select(),
        inventoryRecords: true,
        orderItems: true,
        snapshots: true,
        snapshotHistories: true,
      },
    } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariant> {
    return {
      id: input.id,
      product_id: input.product.id,
      sku_code: input.sku_code,
      option_values: input.option_values,
      price: input.price ?? undefined,
      stock_quantity: input.stock_quantity,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
    } satisfies IEcommerceMallProductVariant;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductVariantTransformer {
//       export type Payload = Prisma.ecommerce_mall_product_variantsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             sku_code: true,
//             option_values: true,
//             price: true,
//             stock_quantity: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             product: EcommerceMallProductAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductVariant> {
//         return {
//   id: {string},
//   product_id: {string},
//   sku_code: {string},
//   option_values: {string},
//   price: {number | null},
//   stock_quantity: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   product: await EcommerceMallProductAtSummaryTransformer.transform(input.product),
//         };
//       }
//     }
//--------------------------------------------------------------
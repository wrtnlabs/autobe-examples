import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallProductVariantOptionTransformer } from "./EcommerceMallProductVariantOptionTransformer";

export namespace EcommerceMallProductVariantTransformer {
  export type Payload = Prisma.ecommerce_mall_product_variantsGetPayload<
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
        product: EcommerceMallProductAtSummaryTransformer.select(),
        variantOptions: EcommerceMallProductVariantOptionTransformer.select(),
        inventoryRecords: {
          select: {
            quantity_change: true,
          },
        } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariant> {
    return {
      id: input.id,
      skuCode: input.sku_code,
      price: input.price,
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      variantOptions: await ArrayUtil.asyncMap(
        input.variantOptions,
        EcommerceMallProductVariantOptionTransformer.transform,
      ),
      inventoryQuantity: input.inventoryRecords.reduce(
        (sum, record) => sum + record.quantity_change,
        0,
      ),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
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
//             skuCode: true,
//             price: true,
//             inventoryQuantity: true,
//             createdAt: true,
//             updatedAt: true,
//             deletedAt: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductVariant> {
//         return {
//   id: {string},
//   skuCode: {string},
//   price: {number | null},
//   product: {IEcommerceMallProduct.ISummary},
//   variantOptions: {Array<IEcommerceMallProductVariantOption>},
//   inventoryQuantity: {integer},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
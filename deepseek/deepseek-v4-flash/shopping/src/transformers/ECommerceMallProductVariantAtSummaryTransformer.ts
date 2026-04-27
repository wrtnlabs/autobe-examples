import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
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
import { ECommerceMallProductAtSummaryTransformer } from "./ECommerceMallProductAtSummaryTransformer";

export namespace ECommerceMallProductVariantAtSummaryTransformer {
  export type Payload = Prisma.e_commerce_mall_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price: true,
        created_at: true,
        product: ECommerceMallProductAtSummaryTransformer.select(),
        inventoryRecords: {
          select: {
            quantity_change: true,
          },
        } satisfies Prisma.e_commerce_mall_inventory_recordsFindManyArgs,
        options: {
          select: {
            key: true,
            value: true,
          },
        } satisfies Prisma.e_commerce_mall_product_variant_optionsFindManyArgs,
      },
    } satisfies Prisma.e_commerce_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallProductVariant.ISummary> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      options: input.options.reduce(
        (acc, opt) => {
          acc[opt.key] = opt.value;
          return acc;
        },
        {} as Record<string, string>,
      ),
      stock: input.inventoryRecords.reduce(
        (sum, record) => sum + record.quantity_change,
        0,
      ),
      effective_price: input.price ?? input.product.base_price,
      product: await ECommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallProductVariant.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallProductVariantAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_product_variantsGetPayload<ReturnType<typeof select>>;
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
//             product: ECommerceMallProductAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.e_commerce_mall_product_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallProductVariant.ISummary> {
//         return {
//   id: {string},
//   sku_code: {string},
//   options: {object},
//   stock: {integer},
//   effective_price: {number},
//   product: await ECommerceMallProductAtSummaryTransformer.transform(input.product),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
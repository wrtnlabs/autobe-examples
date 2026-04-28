import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformProductAtSummaryTransformer } from "./EcommercePlatformProductAtSummaryTransformer";
import { EcommercePlatformProductVariantOptionTransformer } from "./EcommercePlatformProductVariantOptionTransformer";

export namespace EcommercePlatformProductVariantTransformer {
  export type Payload = Prisma.ecommerce_platform_product_variantsGetPayload<
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
        product: EcommercePlatformProductAtSummaryTransformer.select(),
        options: EcommercePlatformProductVariantOptionTransformer.select(),
        inventoryRecords: {
          select: {
            quantity_delta: true,
          },
        } satisfies Prisma.ecommerce_platform_inventory_recordsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_platform_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformProductVariant> {
    const stock_quantity = input.inventoryRecords.reduce(
      (sum, rec) => sum + rec.quantity_delta,
      0,
    );
    return {
      id: input.id,
      sku_code: input.sku_code,
      price: input.price ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      product: await EcommercePlatformProductAtSummaryTransformer.transform(
        input.product,
      ),
      options: await ArrayUtil.asyncMap(
        input.options,
        EcommercePlatformProductVariantOptionTransformer.transform,
      ),
      stock_quantity,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformProductVariantTransformer {
//       export type Payload = Prisma.ecommerce_platform_product_variantsGetPayload<ReturnType<typeof select>>;
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
//             product: EcommercePlatformProductAtSummaryTransformer.select(),
//             options: EcommercePlatformProductVariantOptionTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_product_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformProductVariant> {
//         return {
//   created_at: {string},
//   deleted_at: {null | string},
//   id: {string},
//   options: await ArrayUtil.asyncMap(input.options, EcommercePlatformProductVariantOptionTransformer.transform),
//   price: {null | number},
//   product: await EcommercePlatformProductAtSummaryTransformer.transform(input.product),
//   sku_code: {string},
//   stock_quantity: {integer},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
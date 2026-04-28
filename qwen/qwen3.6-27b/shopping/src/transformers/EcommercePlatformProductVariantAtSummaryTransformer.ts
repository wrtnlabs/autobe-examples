import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
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

export namespace EcommercePlatformProductVariantAtSummaryTransformer {
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
        inventoryRecords: {
          select: {
            quantity_delta: true,
          },
        } satisfies Prisma.ecommerce_platform_inventory_recordsFindManyArgs,
        product: EcommercePlatformProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformProductVariant.ISummary> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      price: input.price ?? null,
      stock_quantity: input.inventoryRecords.reduce(
        (sum, record) => sum + record.quantity_delta,
        0,
      ),
      product: await EcommercePlatformProductAtSummaryTransformer.transform(
        input.product,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies IEcommercePlatformProductVariant.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformProductVariantAtSummaryTransformer {
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
//           },
//         } satisfies Prisma.ecommerce_platform_product_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformProductVariant.ISummary> {
//         return {
//   id: {string},
//   sku_code: {string},
//   price: {number | null},
//   stock_quantity: {integer},
//   product: await EcommercePlatformProductAtSummaryTransformer.transform(input.product),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";

export namespace EcommerceMallProductVariantSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_product_variant_snapshotsGetPayload<
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
        productVariant:
          EcommerceMallProductVariantAtSummaryTransformer.select(),
        product: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
        seller: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
        productSnapshots: { select: { id: true } },
      },
    } satisfies Prisma.ecommerce_mall_product_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariantSnapshot> {
    return {
      id: input.id,
      productVariant:
        await EcommerceMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      product_id: input.product.id,
      seller_id: input.seller.id,
      sku_code: input.sku_code,
      option_values: input.option_values,
      price: input.price !== null ? Number(input.price) : null,
      stock_quantity: input.stock_quantity,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommerceMallProductVariantSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductVariantSnapshotTransformer {
//       export type Payload = Prisma.ecommerce_mall_product_variant_snapshotsGetPayload<ReturnType<typeof select>>;
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
//             productVariant: EcommerceMallProductVariantAtSummaryTransformer.select(),
//             product_id: true,
//             seller_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_product_variant_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductVariantSnapshot> {
//         return {
//   id: {string},
//   productVariant: await EcommerceMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//   product_id: {string},
//   seller_id: {string},
//   sku_code: {string},
//   option_values: {string},
//   price: {number | null},
//   stock_quantity: {integer},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
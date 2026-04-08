import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductVariantSnapshotAtSummaryTransformer {
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
        productVariant: { select: { id: true } },
        product: { select: { id: true } },
        seller: { select: { id: true } },
        productSnapshots: { select: { id: true } },
      },
    } satisfies Prisma.ecommerce_mall_product_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariantSnapshot.ISummary> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      option_values: input.option_values,
      price: input.price,
      stock_quantity: input.stock_quantity,
      product_variant_id: input.productVariant.id,
      product_id: input.product.id,
      seller_id: input.seller.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommerceMallProductVariantSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductVariantSnapshotAtSummaryTransformer {
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
//             product_variant_id: true,
//             product_id: true,
//             seller_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_product_variant_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductVariantSnapshot.ISummary> {
//         return {
//   id: {string},
//   sku_code: {string},
//   option_values: {string},
//   price: {number | null},
//   stock_quantity: {integer},
//   product_variant_id: {string},
//   product_id: {string},
//   seller_id: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------